-- Fase 9: cierre de caja por JORNADA + reportes
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"
--
-- Una fila de cash_closings ES la jornada: se abre (estado 'abierta',
-- opened_at) cuando arranca el bar y se cierra (estado 'cerrada',
-- closed_at) al hacer el corte. Todo lo del periodo [opened_at, closed_at]
-- (ventas, gastos, propinas, etc.) se agrega por created_at -> maneja el
-- cruce de medianoche sin depender del dia calendario. Solo una jornada
-- abierta a la vez. Al cerrar se guarda el snapshot de totales.

create table if not exists public.cash_closings (
  id uuid primary key default gen_random_uuid(),
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid references public.employees(id) on delete set null,
  closed_by uuid references public.employees(id) on delete set null,

  -- Snapshot de totales (se llenan al cerrar)
  ventas_efectivo numeric(14, 2) not null default 0,
  ventas_tarjeta numeric(14, 2) not null default 0,
  ventas_transferencia numeric(14, 2) not null default 0,
  ventas_total numeric(14, 2) not null default 0,
  propinas_recaudadas numeric(14, 2) not null default 0,
  propinas_efectivo numeric(14, 2) not null default 0,
  propinas_liquidadas numeric(14, 2) not null default 0,
  gastos_total numeric(14, 2) not null default 0,
  base_total numeric(14, 2) not null default 0,
  retiros_total numeric(14, 2) not null default 0,
  cortesias_costo numeric(14, 2) not null default 0,
  cortesias_venta numeric(14, 2) not null default 0,
  mermas_costo numeric(14, 2) not null default 0,
  consumo_costo numeric(14, 2) not null default 0,
  efectivo_esperado numeric(14, 2) not null default 0,
  efectivo_contado numeric(14, 2),
  diferencia numeric(14, 2),
  neto numeric(14, 2) not null default 0,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.cash_closings enable row level security;
drop policy if exists "acceso anon provisional" on public.cash_closings;
create policy "acceso anon provisional" on public.cash_closings
  for all to anon using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.cash_closings;
exception when duplicate_object then null; end $$;
