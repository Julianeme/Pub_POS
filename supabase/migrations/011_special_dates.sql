-- Fase 8: descuentos por ocasion especial (fecha fija) + tipo porcentaje
-- Ejecutar en Supabase: panel -> SQL Editor -> pegar y "Run"
--
-- Extiende promotions:
--  - modo: 'recurrente' (por dias de semana, como la Fase 7) o 'fecha'
--    (una fecha especifica puntual).
--  - tipo: ahora ademas de '2x1' admite 'porcentaje' (con % en la columna
--    porcentaje).
-- order_items gana promo_valor para recordar el % con el que entro la linea.

alter table public.promotions
  add column if not exists modo text not null default 'recurrente'
  check (modo in ('recurrente', 'fecha'));

alter table public.promotions add column if not exists fecha date;
alter table public.promotions add column if not exists porcentaje numeric(5, 2);

-- Ampliar los tipos de descuento permitidos
alter table public.promotions drop constraint if exists promotions_tipo_check;
alter table public.promotions add constraint promotions_tipo_check
  check (tipo in ('2x1', 'porcentaje'));

-- La linea recuerda el % aplicado (null para 2x1 o sin promo)
alter table public.order_items add column if not exists promo_valor numeric(5, 2);
