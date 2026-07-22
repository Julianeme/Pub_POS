-- Fase 7: promociones por dia/hora (happy hour). Por ahora tipo 2x1.
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"
--
-- Diseno: la promo se "congela" al PEDIR (no al pagar). Al agregar un
-- producto, si hay una promo 2x1 activa segun dia/hora, el order_item se
-- marca con promo_tipo='2x1'. El total (en pantalla y en el cobro del
-- servidor) usa la MISMA regla, para que lo mostrado == lo cobrado.
-- 2x1 por linea: se cobra ceil(cantidad / 2) unidades.

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default '2x1' check (tipo in ('2x1')),
  dias_semana int[] not null default '{}',   -- 0=Domingo .. 6=Sabado (JS getDay)
  hora_inicio time not null default '00:00',
  hora_fin time not null default '23:59',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Productos incluidos en cada promo
create table if not exists public.promotion_products (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (promotion_id, product_id)
);

-- El order_item recuerda con que promo entro (snapshot del nombre)
alter table public.order_items add column if not exists promo_tipo text;
alter table public.order_items add column if not exists promo_nombre text;

alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;

drop policy if exists "acceso anon provisional" on public.promotions;
create policy "acceso anon provisional" on public.promotions
  for all to anon using (true) with check (true);

drop policy if exists "acceso anon provisional" on public.promotion_products;
create policy "acceso anon provisional" on public.promotion_products
  for all to anon using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.promotions;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.promotion_products;
exception when duplicate_object then null; end $$;

-- ==========================================================================
-- Redefinir el cobro para que aplique el 2x1 al sumar (misma regla que el
-- frontend: ceil(cantidad/2) para lineas con promo_tipo '2x1').
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
  v_monto numeric(12, 2);
  v_abiertas int;
begin
  select table_id into v_table_id from public.table_seats where id = p_seat_id;
  if v_table_id is null then
    raise exception 'Sub-cuenta inexistente';
  end if;

  select coalesce(sum(
    case when promo_tipo = '2x1'
      then ceil(cantidad::numeric / 2) * precio_unitario
      else cantidad * precio_unitario
    end
  ), 0) into v_monto
  from public.order_items
  where table_seat_id = p_seat_id and estado = 'activo';

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

create or replace function public.pay_bar_seat(
  p_seat_id uuid,
  p_metodo text,
  p_empleado_id uuid
)
returns void
language plpgsql
as $$
declare
  v_monto numeric(12, 2);
begin
  select coalesce(sum(
    case when promo_tipo = '2x1'
      then ceil(cantidad::numeric / 2) * precio_unitario
      else cantidad * precio_unitario
    end
  ), 0) into v_monto
  from public.order_items
  where bar_seat_id = p_seat_id and estado = 'activo';

  if v_monto > 0 then
    insert into public.payments (bar_seat_id, metodo, monto, empleado_id)
    values (p_seat_id, p_metodo, v_monto, p_empleado_id);
  end if;

  update public.order_items set estado = 'pagado'
  where bar_seat_id = p_seat_id and estado = 'activo';

  update public.courtesy_items set bar_seat_id = null
  where bar_seat_id = p_seat_id;

  update public.bar_seats set estado = 'libre', nombre_cliente = null
  where id = p_seat_id;
end;
$$;

grant execute on function public.pay_table_seat(uuid, text, uuid) to anon;
grant execute on function public.pay_bar_seat(uuid, text, uuid) to anon;
