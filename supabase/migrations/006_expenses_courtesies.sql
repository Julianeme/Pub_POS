-- Fase 6: gastos (comprar hielo) y cortesias (regalar coctel)
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"
--
-- Ambas tablas alimentan el cierre de caja del dia (Fase 9). Se guarda el
-- empleado que registro/autorizo y la fecha (created_at). El "turno" se
-- resolvera en Fase 9 agrupando por dia; aqui basta con created_at.

-- Gastos: la tabla es general (tipo + descripcion) para admitir "otros"
-- gastos en el futuro; por ahora el boton solo registra tipo 'hielo'.
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'hielo',
  descripcion text,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  costo_unitario numeric(12, 2) not null check (costo_unitario >= 0),
  total numeric(12, 2) not null check (total >= 0),
  empleado_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Cortesias: se guarda snapshot del nombre y de ambos precios (costo y
-- publico) al momento de regalar, para valorar el cierre a costo y a venta.
create table if not exists public.courtesy_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  nombre_producto text not null,
  cantidad int not null check (cantidad > 0),
  costo_unitario numeric(12, 2) not null default 0,
  precio_publico numeric(12, 2) not null default 0,
  empleado_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
alter table public.courtesy_items enable row level security;

drop policy if exists "acceso anon provisional" on public.expenses;
create policy "acceso anon provisional" on public.expenses
  for all to anon using (true) with check (true);

drop policy if exists "acceso anon provisional" on public.courtesy_items;
create policy "acceso anon provisional" on public.courtesy_items
  for all to anon using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.expenses;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.courtesy_items;
exception when duplicate_object then null; end $$;

-- ==========================================================================
-- Registrar una cortesia leyendo los precios del lado del servidor, para no
-- exponer el precio de costo a roles no-admin (meseros).
-- ==========================================================================
create or replace function public.add_courtesy(
  p_product_id uuid,
  p_cantidad int,
  p_empleado_id uuid
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
    (product_id, nombre_producto, cantidad, costo_unitario, precio_publico, empleado_id)
  values
    (p_product_id, v_nombre, p_cantidad, v_costo, v_publico, p_empleado_id);
end;
$$;

grant execute on function public.add_courtesy(uuid, int, uuid) to anon;
