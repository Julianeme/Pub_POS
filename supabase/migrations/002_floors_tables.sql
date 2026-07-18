-- Fase 2: pisos, mesas, sub-cuentas de mesa y puestos de barra
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.floors(id) on delete cascade,
  nombre text not null,
  estado text not null default 'libre' check (estado in ('libre', 'ocupada')),
  orden int not null default 0,
  created_at timestamptz not null default now()
);

-- Sub-cuentas dentro de una mesa (se usaran a fondo en la Fase 4)
create table if not exists public.table_seats (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete cascade,
  nombre text not null,
  estado text not null default 'abierto' check (estado in ('abierto', 'pagado')),
  created_at timestamptz not null default now()
);

create table if not exists public.bar_seats (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_cliente text,
  estado text not null default 'libre' check (estado in ('libre', 'ocupado')),
  orden int not null default 0,
  created_at timestamptz not null default now()
);

-- RLS: politica abierta para anon (provisional del MVP, igual que employees)
alter table public.floors enable row level security;
alter table public.tables enable row level security;
alter table public.table_seats enable row level security;
alter table public.bar_seats enable row level security;

drop policy if exists "acceso anon provisional" on public.floors;
create policy "acceso anon provisional" on public.floors
  for all to anon using (true) with check (true);

drop policy if exists "acceso anon provisional" on public.tables;
create policy "acceso anon provisional" on public.tables
  for all to anon using (true) with check (true);

drop policy if exists "acceso anon provisional" on public.table_seats;
create policy "acceso anon provisional" on public.table_seats
  for all to anon using (true) with check (true);

drop policy if exists "acceso anon provisional" on public.bar_seats;
create policy "acceso anon provisional" on public.bar_seats
  for all to anon using (true) with check (true);

-- Tiempo real: publicar cambios de estas tablas para que todas las
-- tablets vean el mapa actualizado al instante
do $$ begin
  alter publication supabase_realtime add table public.floors;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.tables;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.bar_seats;
exception when duplicate_object then null; end $$;

-- ==========================================================================
-- Datos semilla (solo si las tablas estan vacias):
-- Piso 1 con 5 mesas, Piso 2 con 3 mesas, barra con 6 puestos
-- ==========================================================================

insert into public.floors (nombre, orden)
select v.nombre, v.orden
from (values ('Piso 1', 1), ('Piso 2', 2)) as v(nombre, orden)
where not exists (select 1 from public.floors);

insert into public.tables (floor_id, nombre, orden)
select f.id, 'Mesa ' || n.n, n.n
from public.floors f
join lateral generate_series(
  1, case f.nombre when 'Piso 1' then 5 else 3 end
) as n(n) on true
where not exists (select 1 from public.tables);

insert into public.bar_seats (nombre, orden)
select 'Puesto ' || n, n
from generate_series(1, 6) as n
where not exists (select 1 from public.bar_seats);
