-- Fase 7 (correccion): agrupar promociones a nivel de mesa
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"
--
-- Problema: el 2x1 se calculaba por sub-cuenta. Dos personas con 1 aperol
-- cada una (2 sub-cuentas) no activaban el 2x1. Solucion: agrupar el
-- consumo de toda la mesa por producto y repartir el descuento.
--
-- 2x1 agrupado: para un producto con Q unidades en toda la mesa, se cobran
-- ceil(Q/2). A cada linea con q unidades le corresponde, proporcional:
--   round( q / Q * ceil(Q/2) * precio_unitario )
-- Ej: 2 aperoles (1 por persona), Q=2 -> se cobra 1 -> cada linea de 1 paga
-- round(1/2 * 1 * 35000) = 17500. Cada quien paga la mitad.
--
-- "opened_at" delimita la ocupacion actual de la mesa (para no mezclar con
-- ocupaciones anteriores ya pagadas). "agrupar_promos" es el interruptor
-- por mesa (por defecto activo).

alter table public.tables add column if not exists opened_at timestamptz;
alter table public.tables add column if not exists agrupar_promos boolean not null default true;

-- Backfill: a las mesas ya ocupadas les fijamos opened_at al inicio de su
-- ocupacion actual (la sub-cuenta abierta mas antigua), para que el
-- agrupamiento incluya su consumo actual.
update public.tables t
set opened_at = coalesce(
  (select min(ts.created_at) from public.table_seats ts
   where ts.table_id = t.id and ts.estado = 'abierto'),
  now()
)
where t.estado = 'ocupada' and t.opened_at is null;

-- ==========================================================================
-- Cobro de sub-cuenta con 2x1 agrupado por mesa (si agrupar_promos = true)
-- ==========================================================================
create or replace function public.pay_table_seat(
  p_seat_id uuid,
  p_metodo text,
  p_empleado_id uuid
)
returns void
language plpgsql
as $$
declare
  v_table_id uuid;
  v_opened_at timestamptz;
  v_agrupar boolean;
  v_monto numeric(12, 2);
  v_abiertas int;
begin
  select ts.table_id, t.opened_at, t.agrupar_promos
    into v_table_id, v_opened_at, v_agrupar
  from public.table_seats ts
  join public.tables t on t.id = ts.table_id
  where ts.id = p_seat_id;

  if v_table_id is null then
    raise exception 'Sub-cuenta inexistente';
  end if;

  if v_agrupar then
    -- Suma de las lineas activas de ESTA sub-cuenta, aplicando el 2x1
    -- agrupado por producto sobre toda la ocupacion (items activos o ya
    -- pagados de sub-cuentas creadas desde opened_at).
    select coalesce(sum(
      case when oi.promo_tipo = '2x1' then
        case when coalesce(gq.qtotal, 0) > 0
          then round(oi.cantidad::numeric / gq.qtotal * ceil(gq.qtotal / 2.0) * oi.precio_unitario)
          else ceil(oi.cantidad::numeric / 2) * oi.precio_unitario
        end
      else oi.cantidad * oi.precio_unitario end
    ), 0) into v_monto
    from public.order_items oi
    cross join lateral (
      select coalesce(sum(oi2.cantidad), 0) as qtotal
      from public.order_items oi2
      join public.table_seats ts2 on ts2.id = oi2.table_seat_id
      where ts2.table_id = v_table_id
        and (v_opened_at is null or ts2.created_at >= v_opened_at)
        and oi2.estado in ('activo', 'pagado')
        and oi2.promo_tipo = '2x1'
        and oi2.product_id = oi.product_id
        and oi2.precio_unitario = oi.precio_unitario
    ) gq
    where oi.table_seat_id = p_seat_id and oi.estado = 'activo';
  else
    -- 2x1 por linea (sin agrupar)
    select coalesce(sum(
      case when oi.promo_tipo = '2x1'
        then ceil(oi.cantidad::numeric / 2) * oi.precio_unitario
        else oi.cantidad * oi.precio_unitario
      end
    ), 0) into v_monto
    from public.order_items oi
    where oi.table_seat_id = p_seat_id and oi.estado = 'activo';
  end if;

  if v_monto > 0 then
    insert into public.payments (table_seat_id, table_id, metodo, monto, empleado_id)
    values (p_seat_id, v_table_id, p_metodo, v_monto, p_empleado_id);
  end if;

  update public.order_items set estado = 'pagado'
  where table_seat_id = p_seat_id and estado = 'activo';

  update public.table_seats set estado = 'pagado' where id = p_seat_id;

  select count(*) into v_abiertas
  from public.table_seats
  where table_id = v_table_id and estado = 'abierto';

  if v_abiertas = 0 then
    update public.tables set estado = 'libre' where id = v_table_id;
  end if;
end;
$$;

grant execute on function public.pay_table_seat(uuid, text, uuid) to anon;
