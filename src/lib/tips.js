import { supabase } from './supabase'

// Registra una propina recaudada al cobrar. Puede ligarse a la sub-cuenta o
// puesto de origen (opcional, para trazabilidad).
export async function addTip({ monto, metodo, tableSeatId = null, barSeatId = null, empleadoId }) {
  const { error } = await supabase.from('tips').insert({
    monto,
    metodo,
    table_seat_id: tableSeatId,
    bar_seat_id: barSeatId,
    empleado_id: empleadoId,
  })
  if (error) throw new Error('No se pudo registrar la propina')
}

// Resumen del pozo de propinas: total recaudado, total liquidado y saldo.
export async function getTipsSummary() {
  const [tipsRes, payoutsRes] = await Promise.all([
    supabase.from('tips').select('monto'),
    supabase.from('tip_payouts').select('monto'),
  ])
  if (tipsRes.error || payoutsRes.error) {
    throw new Error('No se pudo cargar el resumen de propinas')
  }
  const recaudado = (tipsRes.data ?? []).reduce((s, t) => s + Number(t.monto), 0)
  const liquidado = (payoutsRes.data ?? []).reduce((s, p) => s + Number(p.monto), 0)
  return { recaudado, liquidado, saldo: recaudado - liquidado }
}

// Suma de propinas recaudadas en un rango de fechas [desde, hasta] (inclusive),
// para ayudar a decidir cuanto liquidar por ese periodo.
export async function getTipsInRange(desde, hasta) {
  let q = supabase.from('tips').select('monto')
  if (desde) q = q.gte('created_at', `${desde}T00:00:00`)
  if (hasta) q = q.lte('created_at', `${hasta}T23:59:59`)
  const { data, error } = await q
  if (error) throw new Error('No se pudo calcular el rango')
  return (data ?? []).reduce((s, t) => s + Number(t.monto), 0)
}

// Registra una liquidacion (pago) de propinas a un empleado.
export async function createTipPayout({ empleadoId, monto, desde, hasta, nota, createdBy }) {
  const { error } = await supabase.from('tip_payouts').insert({
    empleado_id: empleadoId,
    monto,
    desde: desde || null,
    hasta: hasta || null,
    nota,
    created_by: createdBy,
  })
  if (error) throw new Error('No se pudo registrar la liquidacion')
}

export async function listTipPayouts(limit = 20) {
  const { data, error } = await supabase
    .from('tip_payouts')
    .select('id, monto, desde, hasta, nota, created_at, empleado:empleado_id(nombre)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error('No se pudieron cargar las liquidaciones')
  return data ?? []
}
