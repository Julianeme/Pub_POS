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

// Devuelve la promo activa (o null) para un producto en un instante dado.
// Maneja horarios que cruzan medianoche (ej. 22:00 -> 02:00).
export function activePromoForProduct(promos, productId, now = new Date()) {
  const weekday = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  return (
    promos.find((p) => {
      if (!p.product_ids.includes(productId)) return false
      if (!p.dias_semana.includes(weekday)) return false
      const ini = toMinutes(p.hora_inicio)
      const fin = toMinutes(p.hora_fin)
      if (ini <= fin) return minutes >= ini && minutes <= fin
      // cruza medianoche
      return minutes >= ini || minutes <= fin
    }) ?? null
  )
}

// ---- lectura ----

// Promos activas con sus productos, para evaluar al agregar al pedido.
export async function listActivePromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select('id, nombre, tipo, dias_semana, hora_inicio, hora_fin, promotion_products(product_id)')
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
    .select(
      'id, nombre, tipo, dias_semana, hora_inicio, hora_fin, activo, promotion_products(product_id)'
    )
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

export async function createPromotion({ nombre, tipo, dias, horaInicio, horaFin, productIds }) {
  const { data, error } = await supabase
    .from('promotions')
    .insert({
      nombre,
      tipo,
      dias_semana: dias,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
    })
    .select('id')
    .single()
  if (error) throw new Error('No se pudo crear la promocion')
  await setPromotionProducts(data.id, productIds)
}

export async function updatePromotion(id, { nombre, tipo, dias, horaInicio, horaFin, productIds }) {
  const { error } = await supabase
    .from('promotions')
    .update({
      nombre,
      tipo,
      dias_semana: dias,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
    })
    .eq('id', id)
  if (error) throw new Error('No se pudo actualizar la promocion')
  await setPromotionProducts(id, productIds)
}

export async function setPromotionActive(id, activo) {
  const { error } = await supabase.from('promotions').update({ activo }).eq('id', id)
  if (error) throw new Error('No se pudo cambiar el estado de la promocion')
}

export async function deletePromotion(id) {
  const { error } = await supabase.from('promotions').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar la promocion')
}
