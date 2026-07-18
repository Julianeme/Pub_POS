-- Fase 3: catalogo de productos
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null check (categoria in ('coctel', 'bebida', 'otro')),
  precio_publico numeric(12, 2) not null check (precio_publico >= 0),
  precio_costo numeric(12, 2) not null default 0 check (precio_costo >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS: politica abierta para anon (provisional del MVP)
alter table public.products enable row level security;

drop policy if exists "acceso anon provisional" on public.products;
create policy "acceso anon provisional" on public.products
  for all to anon using (true) with check (true);

-- Realtime: util para que el catalogo se refresque en las tablets
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null; end $$;

-- Semillas de ejemplo (solo si la tabla esta vacia) para poder probar.
-- Precios de ejemplo: ajustar/eliminar productos desde la pantalla admin.
insert into public.products (nombre, categoria, precio_publico, precio_costo)
select * from (values
  ('Mojito',        'coctel', 25000, 8000),
  ('Margarita',     'coctel', 28000, 9000),
  ('Gin Tonic',     'coctel', 30000, 10000),
  ('Cerveza',       'bebida', 10000, 4000),
  ('Gaseosa',       'bebida', 6000,  2000),
  ('Agua',          'bebida', 5000,  1500),
  ('Porcion papas', 'otro',   12000, 5000)
) as v(nombre, categoria, precio_publico, precio_costo)
where not exists (select 1 from public.products);
