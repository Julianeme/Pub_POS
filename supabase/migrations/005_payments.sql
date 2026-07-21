-- Fase 5: cobro y cierre de cuenta
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"
--
-- Disenio: cada cobro se registra en payments (metodo + monto + empleado +
-- fecha) para alimentar el cierre de caja (Fase 9). Los payments NO se
-- borran aunque luego se elimine la mesa (on delete set null) -> el
-- historial de ventas sobrevive.
--
-- El cobro es una operacion que toca varias tablas (registrar pago, marcar
-- items pagados, cerrar sub-cuenta, liberar mesa si es la ultima). Se hace
-- dentro de funciones plpgsql para que sea atomico: o pasa todo, o nada.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  table_seat_id uuid references public.table_seats(id) on delete set null,
  bar_seat_id uuid references public.bar_seats(id) on delete set null,
  table_id uuid references public.tables(id) on delete set null,
  metodo text not null check (metodo in ('efectivo', 'tarjeta', 'transferencia')),
  monto numeric(12, 2) not null check (monto >= 0),
  empleado_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "acceso anon provisional" on public.payments;
create policy "acceso anon provisional" on public.payments
  for all to anon using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.payments;
exception when duplicate_object then null; end $$;

-- ==========================================================================
-- Cobrar una sub-cuenta de mesa
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

  select coalesce(sum(cantidad * precio_unitario), 0) into v_monto
  from public.order_items
  where table_seat_id = p_seat_id and estado = 'activo';

  -- Solo se registra un pago si hubo consumo (evita filas de $0 en el cierre)
  if v_monto > 0 then
    insert into public.payments (table_seat_id, table_id, metodo, monto, empleado_id)
    values (p_seat_id, v_table_id, p_metodo, v_monto, p_empleado_id);
  end if;

  update public.order_items set estado = 'pagado'
  where table_seat_id = p_seat_id and estado = 'activo';

  update public.table_seats set estado = 'pagado' where id = p_seat_id;

  -- Si ya no quedan sub-cuentas abiertas, la mesa vuelve a estar libre
  select count(*) into v_abiertas
  from public.table_seats
  where table_id = v_table_id and estado = 'abierto';

  if v_abiertas = 0 then
    update public.tables set estado = 'libre' where id = v_table_id;
  end if;
end;
$$;

-- ==========================================================================
-- Cobrar la mesa completa (todas las sub-cuentas abiertas, mismo metodo)
-- ==========================================================================
create or replace function public.pay_table(
  p_table_id uuid,
  p_metodo text,
  p_empleado_id uuid
)
returns void
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select id from public.table_seats
    where table_id = p_table_id and estado = 'abierto'
  loop
    perform public.pay_table_seat(r.id, p_metodo, p_empleado_id);
  end loop;
end;
$$;

-- ==========================================================================
-- Cobrar un puesto de barra (y liberarlo)
-- ==========================================================================
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
  select coalesce(sum(cantidad * precio_unitario), 0) into v_monto
  from public.order_items
  where bar_seat_id = p_seat_id and estado = 'activo';

  if v_monto > 0 then
    insert into public.payments (bar_seat_id, metodo, monto, empleado_id)
    values (p_seat_id, p_metodo, v_monto, p_empleado_id);
  end if;

  update public.order_items set estado = 'pagado'
  where bar_seat_id = p_seat_id and estado = 'activo';

  update public.bar_seats set estado = 'libre', nombre_cliente = null
  where id = p_seat_id;
end;
$$;

-- Permitir que la anon key (que usa la app) ejecute estas funciones
grant execute on function public.pay_table_seat(uuid, text, uuid) to anon;
grant execute on function public.pay_table(uuid, text, uuid) to anon;
grant execute on function public.pay_bar_seat(uuid, text, uuid) to anon;
