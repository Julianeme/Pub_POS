-- Fase de seguridad (endurecimiento pragmatico)
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"
--
-- 1) PIN hasheados (bcrypt) en tabla aparte oculta a la anon key.
-- 2) Login y alta/edicion de empleados via funciones seguras (SECURITY DEFINER).
-- 3) Tablas de dinero/historial en modo "solo agregar" (sin borrar/alterar).
-- 4) Validacion del monto de cobro en el servidor.
--
-- NO cubierto por este camino (requiere login real / Supabase Auth):
--  - Impedir que la anon key LEA datos (precio de costo, etc.).
--  - Hacer cumplir "solo admin" en el servidor (sigue siendo control de UI).

create extension if not exists pgcrypto with schema extensions;

-- ==========================================================================
-- 1) Secretos de empleado (hash del PIN), ocultos a anon
-- ==========================================================================
create table if not exists public.employee_secrets (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  pin_hash text not null
);

alter table public.employee_secrets enable row level security;
-- Sin politicas para anon: nadie accede directo. Solo las funciones
-- SECURITY DEFINER (owner) pueden leer/escribir.

-- Migrar los PIN existentes (texto plano) a hash y eliminar la columna plana
insert into public.employee_secrets (employee_id, pin_hash)
select id, extensions.crypt(pin, extensions.gen_salt('bf'))
from public.employees
where pin is not null
on conflict (employee_id) do nothing;

alter table public.employees drop column if exists pin;

-- ==========================================================================
-- 2) Login seguro: valida el hash del lado del servidor, no expone el hash
-- ==========================================================================
create or replace function public.login_employee(p_codigo text, p_pin text)
returns table (
  id uuid,
  nombre text,
  codigo text,
  rol text,
  puede_dar_cortesia boolean,
  cortesia_hasta date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select e.id, e.nombre, e.codigo, e.rol, e.puede_dar_cortesia, e.cortesia_hasta
  from public.employees e
  join public.employee_secrets s on s.employee_id = e.id
  where e.codigo = p_codigo
    and s.pin_hash = extensions.crypt(p_pin, s.pin_hash);
end;
$$;

-- Alta/edicion de empleado (guarda el PIN hasheado). p_id null = crear.
-- p_pin null/'' en edicion = no cambiar el PIN.
create or replace function public.upsert_employee(
  p_id uuid,
  p_nombre text,
  p_codigo text,
  p_rol text,
  p_puede_cortesia boolean,
  p_cortesia_hasta date,
  p_pin text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into public.employees (nombre, codigo, rol, puede_dar_cortesia, cortesia_hasta)
    values (p_nombre, p_codigo, p_rol, coalesce(p_puede_cortesia, false), p_cortesia_hasta)
    returning id into v_id;

    insert into public.employee_secrets (employee_id, pin_hash)
    values (v_id, extensions.crypt(coalesce(p_pin, ''), extensions.gen_salt('bf')));
  else
    update public.employees
    set nombre = p_nombre,
        codigo = p_codigo,
        rol = p_rol,
        puede_dar_cortesia = coalesce(p_puede_cortesia, false),
        cortesia_hasta = p_cortesia_hasta
    where id = p_id;
    v_id := p_id;

    if p_pin is not null and p_pin <> '' then
      insert into public.employee_secrets (employee_id, pin_hash)
      values (v_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
      on conflict (employee_id) do update set pin_hash = excluded.pin_hash;
    end if;
  end if;

  return v_id;
exception
  when unique_violation then
    raise exception 'codigo_duplicado';
end;
$$;

grant execute on function public.login_employee(text, text) to anon;
grant execute on function public.upsert_employee(uuid, text, text, text, boolean, date, text) to anon;

-- ==========================================================================
-- 3) Tablas de dinero/historial en modo "solo agregar"
--    (la app nunca las borra; algunas se actualizan y ahi sí se permite)
-- ==========================================================================

-- Solo SELECT + INSERT (sin UPDATE ni DELETE)
do $$
declare t text;
begin
  foreach t in array array[
    'payments', 'tips', 'tip_payouts', 'expenses', 'cash_movements', 'product_losses'
  ] loop
    execute format('drop policy if exists "acceso anon provisional" on public.%I', t);
    execute format('drop policy if exists "anon select" on public.%I', t);
    execute format('drop policy if exists "anon insert" on public.%I', t);
    execute format('create policy "anon select" on public.%I for select to anon using (true)', t);
    execute format('create policy "anon insert" on public.%I for insert to anon with check (true)', t);
  end loop;
end $$;

-- SELECT + INSERT + UPDATE (sin DELETE) -> se actualizan pero no se borran
do $$
declare t text;
begin
  foreach t in array array['order_items', 'courtesy_items', 'cash_closings'] loop
    execute format('drop policy if exists "acceso anon provisional" on public.%I', t);
    execute format('drop policy if exists "anon select" on public.%I', t);
    execute format('drop policy if exists "anon insert" on public.%I', t);
    execute format('drop policy if exists "anon update" on public.%I', t);
    execute format('create policy "anon select" on public.%I for select to anon using (true)', t);
    execute format('create policy "anon insert" on public.%I for insert to anon with check (true)', t);
    execute format('create policy "anon update" on public.%I for update to anon using (true) with check (true)', t);
  end loop;
end $$;

-- ==========================================================================
-- 4) Validacion del monto de cobro en el servidor: 0 <= monto <= total sin
--    descuento de la sub-cuenta / puesto. Evita montos negativos o inflados.
-- ==========================================================================
create or replace function public.pay_table_seat(
  p_seat_id uuid,
  p_metodo text,
  p_empleado_id uuid,
  p_monto numeric
)
returns void
language plpgsql
as $$
declare
  v_table_id uuid;
  v_abiertas int;
  v_raw numeric(14, 2);
begin
  select table_id into v_table_id from public.table_seats where id = p_seat_id;
  if v_table_id is null then
    raise exception 'Sub-cuenta inexistente';
  end if;

  select coalesce(sum(cantidad * precio_unitario), 0) into v_raw
  from public.order_items where table_seat_id = p_seat_id and estado = 'activo';
  if p_monto < 0 or p_monto > v_raw then
    raise exception 'monto_invalido';
  end if;

  if p_monto > 0 then
    insert into public.payments (table_seat_id, table_id, metodo, monto, empleado_id)
    values (p_seat_id, v_table_id, p_metodo, p_monto, p_empleado_id);
  end if;

  update public.order_items set estado = 'pagado'
  where table_seat_id = p_seat_id and estado = 'activo';

  update public.table_seats set estado = 'pagado' where id = p_seat_id;

  select count(*) into v_abiertas
  from public.table_seats where table_id = v_table_id and estado = 'abierto';
  if v_abiertas = 0 then
    update public.tables set estado = 'libre' where id = v_table_id;
  end if;
end;
$$;

create or replace function public.pay_bar_seat(
  p_seat_id uuid,
  p_metodo text,
  p_empleado_id uuid,
  p_monto numeric
)
returns void
language plpgsql
as $$
declare
  v_raw numeric(14, 2);
begin
  select coalesce(sum(cantidad * precio_unitario), 0) into v_raw
  from public.order_items where bar_seat_id = p_seat_id and estado = 'activo';
  if p_monto < 0 or p_monto > v_raw then
    raise exception 'monto_invalido';
  end if;

  if p_monto > 0 then
    insert into public.payments (bar_seat_id, metodo, monto, empleado_id)
    values (p_seat_id, p_metodo, p_monto, p_empleado_id);
  end if;

  update public.order_items set estado = 'pagado'
  where bar_seat_id = p_seat_id and estado = 'activo';

  update public.courtesy_items set bar_seat_id = null
  where bar_seat_id = p_seat_id;

  update public.bar_seats set estado = 'libre', nombre_cliente = null
  where id = p_seat_id;
end;
$$;

grant execute on function public.pay_table_seat(uuid, text, uuid, numeric) to anon;
grant execute on function public.pay_bar_seat(uuid, text, uuid, numeric) to anon;
