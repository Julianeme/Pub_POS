import { supabase } from './supabase'

// Dias de la semana con el indice que usa JS Date.getDay() (0=Domingo)
export const DIAS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mie' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Dom' },
]

const DIA_LABEL = Object.fromEntries(DIAS.map((d) => [d.value, d.label]))

export function diasTexto(dias) {
  if (!dias || dias.length === 0) return 'Sin dias'
  // Ordena segun el orden Lun..Dom de DIAS
  return DIAS.filter((d) => dias.includes(d.value))
    .map((d) => d.label)
    .join(', ')
}

// "HH:MM[:SS]" -> minutos del dia
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function horaCorta(hhmm) {
  return hhmm ? hhmm.slice(0, 5) : ''
}

// Fecha local en formato 'YYYY-MM-DD' (para comparar con promotions.fecha)
function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Devuelve la promo activa (o null) para un producto en un instante dado.
// Considera modo 'recurrente' (dias de semana) y 'fecha' (fecha puntual),
// y horarios que cruzan medianoche. Si varias aplican, prioriza la de
// fecha especifica (es un override intencional sobre la recurrente).
export function activePromoForProduct(promos, productId, now = new Date()) {
  const weekday = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const hoy = toDateStr(now)

  const matches = promos.filter((p) => {
    if (!p.product_ids.includes(productId)) return false
    const ini = toMinutes(p.hora_inicio)
    const fin = toMinutes(p.hora_fin)
    const enHorario =
      ini <= fin ? minutes >= ini && minutes <= fin : minutes >= ini || minutes <= fin
    if (!enHorario) return false
    if (p.modo === 'fecha') return p.fecha === hoy
    return p.dias_semana.includes(weekday)
  })

  if (matches.length === 0) return null
  return matches.find((p) => p.modo === 'fecha') ?? matches[0]
}

// ---- lectura ----

// Promos activas con sus productos, para evaluar al agregar al pedido.
const PROMO_FIELDS =
  'id, nombre, modo, tipo, porcentaje, dias_semana, fecha, hora_inicio, hora_fin, promotion_products(product_id)'

export async function listActivePromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select(PROMO_FIELDS)
    .eq('activo', true)
  if (error) throw new Error('No se pudieron cargar las promociones')
  return (data ?? []).map((p) => ({
    ...p,
    product_ids: (p.promotion_products ?? []).map((pp) => pp.product_id),
  }))
}

export async function listPromotionsAdmin() {
  const { data, error } = await supabase
    .from('promotions')
    .select(`${PROMO_FIELDS}, activo`)
    .order('created_at')
  if (error) throw new Error('No se pudieron cargar las promociones')
  return (data ?? []).map((p) => ({
    ...p,
    product_ids: (p.promotion_products ?? []).map((pp) => pp.product_id),
  }))
}

// ---- escritura ----

async function setPromotionProducts(promotionId, productIds) {
  await supabase.from('promotion_products').delete().eq('promotion_id', promotionId)
  if (productIds.length > 0) {
    const rows = productIds.map((product_id) => ({ promotion_id: promotionId, product_id }))
    const { error } = await supabase.from('promotion_products').insert(rows)
    if (error) throw new Error('No se pudieron asignar los productos a la promocion')
  }
}

// Normaliza el payload segun modo (recurrente/fecha) y tipo (2x1/porcentaje)
function promoRow({ nombre, modo, tipo, porcentaje, dias, fecha, horaInicio, horaFin }) {
  return {
    nombre,
    modo,
    tipo,
    porcentaje: tipo === 'porcentaje' ? Number(porcentaje) : null,
    dias_semana: modo === 'recurrente' ? dias : [],
    fecha: modo === 'fecha' ? fecha : null,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
  }
}

export async function createPromotion(data) {
  const { data: row, error } = await supabase
    .from('promotions')
    .insert(promoRow(data))
    .select('id')
    .single()
  if (error) throw new Error('No se pudo crear la promocion')
  await setPromotionProducts(row.id, data.productIds)
}

export async function updatePromotion(id, data) {
  const { error } = await supabase.from('promotions').update(promoRow(data)).eq('id', id)
  if (error) throw new Error('No se pudo actualizar la promocion')
  await setPromotionProducts(id, data.productIds)
}

export async function setPromotionActive(id, activo) {
  const { error } = await supabase.from('promotions').update({ activo }).eq('id', id)
  if (error) throw new Error('No se pudo cambiar el estado de la promocion')
}

export async function deletePromotion(id) {
  const { error } = await supabase.from('promotions').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar la promocion')
}
