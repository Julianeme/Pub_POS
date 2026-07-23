-- Fase 8.6: cuenta del DJ residente (se abre y se cierra como una mesa, pero
-- no requiere cobro: acumula pagos en efectivo + cortesias de la noche).
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"

create table if not exists public.dj_sessions (
  id uuid primary key default gen_random_uuid(),
  nombre_dj text,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid references public.employees(id) on delete set null,
  closed_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Los pagos en efectivo al DJ son gastos (expenses tipo 'dj') ligados a la
-- sesion; las cortesias (bebidas) son courtesy_items ligados a la sesion.
alter table public.expenses add column if not exists dj_session_id uuid
  references public.dj_sessions(id) on delete set null;
alter table public.courtesy_items add column if not exists dj_session_id uuid
  references public.dj_sessions(id) on delete set null;

alter table public.dj_sessions enable row level security;
drop policy if exists "acceso anon provisional" on public.dj_sessions;
create policy "acceso anon provisional" on public.dj_sessions
  for all to anon using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.dj_sessions;
exception when duplicate_object then null; end $$;

-- Ampliar add_courtesy para aceptar la sesion del DJ (cortesia al DJ)
drop function if exists public.add_courtesy(uuid, int, uuid, text, text, uuid, uuid);

create or replace function public.add_courtesy(
  p_product_id uuid,
  p_cantidad int,
  p_empleado_id uuid,
  p_motivo text default null,
  p_motivo_detalle text default null,
  p_table_seat_id uuid default null,
  p_bar_seat_id uuid default null,
  p_dj_session_id uuid default null
)
returns void
language plpgsql
as $$
declare
  v_nombre text;
  v_costo numeric(12, 2);
  v_publico numeric(12, 2);
begin
  select nombre, precio_costo, precio_publico
    into v_nombre, v_costo, v_publico
  from public.products where id = p_product_id;

  if v_nombre is null then
    raise exception 'Producto inexistente';
  end if;

  insert into public.courtesy_items
    (product_id, nombre_producto, cantidad, costo_unitario, precio_publico,
     empleado_id, motivo, motivo_detalle, table_seat_id, bar_seat_id, dj_session_id)
  values
    (p_product_id, v_nombre, p_cantidad, v_costo, v_publico,
     p_empleado_id, p_motivo, p_motivo_detalle, p_table_seat_id, p_bar_seat_id, p_dj_session_id);
end;
$$;

grant execute on function
  public.add_courtesy(uuid, int, uuid, text, text, uuid, uuid, uuid) to anon;
