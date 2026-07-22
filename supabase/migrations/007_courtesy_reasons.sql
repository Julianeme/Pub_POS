-- Fase 6 (extension): motivos de cortesia + cortesia ligada a mesa/barra
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"

-- Lista de motivos precargados que administra el admin.
-- "Otro" NO va aqui: es una opcion fija del sistema (con campo abierto),
-- para que no se pueda borrar y siempre exista una via de escape.
create table if not exists public.courtesy_reasons (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.courtesy_reasons enable row level security;

drop policy if exists "acceso anon provisional" on public.courtesy_reasons;
create policy "acceso anon provisional" on public.courtesy_reasons
  for all to anon using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.courtesy_reasons;
exception when duplicate_object then null; end $$;

-- Motivos semilla (solo si la tabla esta vacia)
insert into public.courtesy_reasons (nombre, orden)
select v.nombre, v.orden
from (values
  ('Aniversario', 1),
  ('Cumpleanos', 2),
  ('Fecha especial', 3),
  ('Compensacion', 4)
) as v(nombre, orden)
where not exists (select 1 from public.courtesy_reasons);

-- La cortesia guarda el motivo como texto (snapshot) + detalle opcional
-- (usado cuando el motivo es "Otro"), y puede ligarse a una sub-cuenta de
-- mesa o a un puesto de barra para trazabilidad. Si no, es cortesia global.
alter table public.courtesy_items add column if not exists motivo text;
alter table public.courtesy_items add column if not exists motivo_detalle text;
alter table public.courtesy_items add column if not exists table_seat_id uuid
  references public.table_seats(id) on delete set null;
alter table public.courtesy_items add column if not exists bar_seat_id uuid
  references public.bar_seats(id) on delete set null;

-- Reemplazar la RPC para aceptar motivo, detalle y el destino (mesa/barra)
drop function if exists public.add_courtesy(uuid, int, uuid);

create or replace function public.add_courtesy(
  p_product_id uuid,
  p_cantidad int,
  p_empleado_id uuid,
  p_motivo text default null,
  p_motivo_detalle text default null,
  p_table_seat_id uuid default null,
  p_bar_seat_id uuid default null
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
     empleado_id, motivo, motivo_detalle, table_seat_id, bar_seat_id)
  values
    (p_product_id, v_nombre, p_cantidad, v_costo, v_publico,
     p_empleado_id, p_motivo, p_motivo_detalle, p_table_seat_id, p_bar_seat_id);
end;
$$;

grant execute on function
  public.add_courtesy(uuid, int, uuid, text, text, uuid, uuid) to anon;

-- Redefinir pay_bar_seat: al cobrar y liberar el puesto, desligar sus
-- cortesias (bar_seat_id = null) para que no reaparezcan en la siguiente
-- ocupacion. El registro de la cortesia se conserva (historial/cierre).
-- (Las mesas no necesitan esto: cada apertura crea sub-cuentas nuevas.)
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

  update public.courtesy_items set bar_seat_id = null
  where bar_seat_id = p_seat_id;

  update public.bar_seats set estado = 'libre', nombre_cliente = null
  where id = p_seat_id;
end;
$$;

grant execute on function public.pay_bar_seat(uuid, text, uuid) to anon;
