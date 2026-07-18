-- Fase 1: tabla de empleados y datos semilla
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text not null unique,
  pin text not null,
  rol text not null check (rol in ('admin', 'mesero', 'cajero')),
  created_at timestamptz not null default now()
);

-- RLS habilitado con política abierta para la anon key.
-- Provisional para el MVP: toda la app usa la anon key y el control de
-- acceso se hace por rol en el frontend. Se endurecerá en una fase posterior.
alter table public.employees enable row level security;

drop policy if exists "acceso anon provisional" on public.employees;
create policy "acceso anon provisional" on public.employees
  for all to anon using (true) with check (true);

-- Datos semilla: administrador inicial
insert into public.employees (nombre, codigo, pin, rol)
values ('Administrador', '0001', '1234', 'admin')
on conflict (codigo) do nothing;
