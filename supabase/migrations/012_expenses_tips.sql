-- Fase 8.5 (previo al cierre): gastos varios, movimientos de caja,
-- mermas/consumo interno y propinas.
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"

-- ==========================================================================
-- Movimientos de caja: base (entra efectivo al abrir) y retiro (sale)
-- No son gastos/perdidas: son movimientos del efectivo en la caja.
-- ==========================================================================
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('base', 'retiro')),
  monto numeric(12, 2) not null check (monto > 0),
  descripcion text,
  empleado_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ==========================================================================
-- Salidas de producto sin venta: merma/rotura y consumo interno.
-- Valoradas a costo (snapshot). Distinto de cortesias (regalo a cliente).
-- ==========================================================================
create table if not exists public.product_losses (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('merma', 'consumo_interno')),
  product_id uuid references public.products(id) on delete set null,
  nombre_producto text not null,
  cantidad int not null check (cantidad > 0),
  costo_unitario numeric(12, 2) not null default 0,
  descripcion text,
  empleado_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ==========================================================================
-- Propinas: se recaudan al cobrar (pozo) y se liquidan a empleados.
-- ==========================================================================
create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  monto numeric(12, 2) not null check (monto > 0),
  metodo text not null check (metodo in ('efectivo', 'tarjeta', 'transferencia')),
  table_seat_id uuid references public.table_seats(id) on delete set null,
  bar_seat_id uuid references public.bar_seats(id) on delete set null,
  empleado_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Liquidaciones (pagos) de propinas a un empleado, por un periodo.
create table if not exists public.tip_payouts (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid references public.employees(id) on delete set null,
  monto numeric(12, 2) not null check (monto > 0),
  desde date,
  hasta date,
  nota text,
  created_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS: politica abierta anon (provisional del MVP)
alter table public.cash_movements enable row level security;
alter table public.product_losses enable row level security;
alter table public.tips enable row level security;
alter table public.tip_payouts enable row level security;

drop policy if exists "acceso anon provisional" on public.cash_movements;
create policy "acceso anon provisional" on public.cash_movements
  for all to anon using (true) with check (true);

drop policy if exists "acceso anon provisional" on public.product_losses;
create policy "acceso anon provisional" on public.product_losses
  for all to anon using (true) with check (true);

drop policy if exists "acceso anon provisional" on public.tips;
create policy "acceso anon provisional" on public.tips
  for all to anon using (true) with check (true);

drop policy if exists "acceso anon provisional" on public.tip_payouts;
create policy "acceso anon provisional" on public.tip_payouts
  for all to anon using (true) with check (true);

-- Realtime
do $$ begin alter publication supabase_realtime add table public.cash_movements;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.product_losses;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.tips;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.tip_payouts;
exception when duplicate_object then null; end $$;

-- ==========================================================================
-- Registrar una merma/consumo interno leyendo el costo en el servidor
-- (no expone precio_costo a meseros).
-- ==========================================================================
create or replace function public.add_product_loss(
  p_tipo text,
  p_product_id uuid,
  p_cantidad int,
  p_empleado_id uuid,
  p_descripcion text default null
)
returns void
language plpgsql
as $$
declare
  v_nombre text;
  v_costo numeric(12, 2);
begin
  select nombre, precio_costo into v_nombre, v_costo
  from public.products where id = p_product_id;
  if v_nombre is null then
    raise exception 'Producto inexistente';
  end if;

  insert into public.product_losses
    (tipo, product_id, nombre_producto, cantidad, costo_unitario, descripcion, empleado_id)
  values
    (p_tipo, p_product_id, v_nombre, p_cantidad, v_costo, p_descripcion, p_empleado_id);
end;
$$;

grant execute on function public.add_product_loss(text, uuid, int, uuid, text) to anon;
