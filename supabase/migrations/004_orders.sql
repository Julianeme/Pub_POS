-- Fase 4: pedidos (order_items) y ajuste de sub-cuentas
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"
--
-- Nota de diseno: en vez de dos tablas orders/order_items usamos una sola
-- order_items ligada directamente a la sub-cuenta (table_seat) o al puesto
-- de barra (bar_seat). Cada fila guarda una "foto" del nombre y precio del
-- producto al momento de pedirlo, para que cambios posteriores de precio
-- no alteren cuentas ya abiertas ni el historial de ventas.
-- Nada se borra: los items se ANULAN (estado) para conservar historial
-- de cara al cierre de caja (Fase 9) y auditoria.

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  table_seat_id uuid references public.table_seats(id) on delete cascade,
  bar_seat_id uuid references public.bar_seats(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  nombre_producto text not null,
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  cantidad int not null check (cantidad > 0),
  estado text not null default 'activo' check (estado in ('activo', 'pagado', 'anulado')),
  empleado_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  -- cada item pertenece exactamente a una sub-cuenta O a un puesto de barra
  check (
    (table_seat_id is not null and bar_seat_id is null)
    or (table_seat_id is null and bar_seat_id is not null)
  )
);

-- Las sub-cuentas ahora pueden quedar "canceladas" (liberar mesa sin cobrar,
-- provisional hasta la Fase 5) ademas de abiertas o pagadas
alter table public.table_seats drop constraint if exists table_seats_estado_check;
alter table public.table_seats add constraint table_seats_estado_check
  check (estado in ('abierto', 'pagado', 'cancelado'));

-- RLS: politica abierta para anon (provisional del MVP)
alter table public.order_items enable row level security;

drop policy if exists "acceso anon provisional" on public.order_items;
create policy "acceso anon provisional" on public.order_items
  for all to anon using (true) with check (true);

-- Realtime: totales en vivo entre tablets
do $$ begin
  alter publication supabase_realtime add table public.order_items;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.table_seats;
exception when duplicate_object then null; end $$;
