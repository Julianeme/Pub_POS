-- Fase 7 (correccion 2): el cobro recibe el monto ya calculado
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"
--
-- El calculo del 2x1 agrupado con prioridad (1o par dentro de la sub-cuenta,
-- 2o entre sub-cuentas, 3o mesa) vive SOLO en el frontend (orders.js). Para
-- que "lo mostrado == lo cobrado" sin duplicar esa logica en SQL, las
-- funciones de cobro ahora reciben el monto ya calculado (p_monto) y solo
-- registran el pago y hacen los cambios de estado.
--
-- Nota de seguridad: el cliente dicta el monto. Aceptable en este MVP (la
-- anon key ya tiene acceso total y el personal es de confianza); se
-- endurecera junto con RLS/roles en la fase de seguridad.

-- Quitar versiones anteriores (calculaban el monto en el server)
drop function if exists public.pay_table(uuid, text, uuid);
drop function if exists public.pay_table_seat(uuid, text, uuid);
drop function if exists public.pay_bar_seat(uuid, text, uuid);

create or replace function public.pay_table_seat(
  p_seat_id uuid,
  p_metodo text,
  p_empleado_id uuid,
  p_monto numeric
)
returns void
language plpgsql
as $$
declare
  v_table_id uuid;
  v_abiertas int;
begin
  select table_id into v_table_id from public.table_seats where id = p_seat_id;
  if v_table_id is null then
    raise exception 'Sub-cuenta inexistente';
  end if;

  if p_monto > 0 then
    insert into public.payments (table_seat_id, table_id, metodo, monto, empleado_id)
    values (p_seat_id, v_table_id, p_metodo, p_monto, p_empleado_id);
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

create or replace function public.pay_bar_seat(
  p_seat_id uuid,
  p_metodo text,
  p_empleado_id uuid,
  p_monto numeric
)
returns void
language plpgsql
as $$
begin
  if p_monto > 0 then
    insert into public.payments (bar_seat_id, metodo, monto, empleado_id)
    values (p_seat_id, p_metodo, p_monto, p_empleado_id);
  end if;

  update public.order_items set estado = 'pagado'
  where bar_seat_id = p_seat_id and estado = 'activo';

  update public.courtesy_items set bar_seat_id = null
  where bar_seat_id = p_seat_id;

  update public.bar_seats set estado = 'libre', nombre_cliente = null
  where id = p_seat_id;
end;
$$;

grant execute on function public.pay_table_seat(uuid, text, uuid, numeric) to anon;
grant execute on function public.pay_bar_seat(uuid, text, uuid, numeric) to anon;
