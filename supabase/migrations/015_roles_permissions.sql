-- Fase 9.5: rol 'encargado' + permiso de cortesia por empleado
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"

-- Nuevo rol intermedio entre mesero y admin
alter table public.employees drop constraint if exists employees_rol_check;
alter table public.employees add constraint employees_rol_check
  check (rol in ('admin', 'mesero', 'cajero', 'encargado'));

-- Permiso para dar cortesias, habilitable por el admin en cada empleado.
-- cortesia_hasta null + puede_dar_cortesia true = indefinido; con fecha =
-- habilitado hasta esa fecha (inclusive).
alter table public.employees add column if not exists puede_dar_cortesia boolean not null default false;
alter table public.employees add column if not exists cortesia_hasta date;
