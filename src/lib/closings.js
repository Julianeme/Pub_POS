import { supabase } from './supabase'

// ---- Jornada abierta ----

export async function getOpenClosing() {
  const { data, error } = await supabase
    .from('cash_closings')
    .select('id, opened_at, opened_by')
    .eq('estado', 'abierta')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('No se pudo cargar la jornada')
  return data
}

export async function openClosing(empleadoId) {
  const { data, error } = await supabase
    .from('cash_closings')
    .insert({ opened_by: empleadoId })
    .select('id, opened_at')
    .single()
  if (error) throw new Error('No se pudo abrir la jornada')
  return data
}

// ---- Resumen del periodo [desde, hasta] ----
// Agrega ventas, propinas, gastos, movimientos de caja, cortesias y mermas.

export async function computeSummary(desde, hasta) {
  const range = (q) => q.gte('created_at', desde).lte('created_at', hasta)
  const [pays, tips, payouts, exps, cash, corts, losses] = await Promise.all([
    range(supabase.from('payments').select('monto, metodo')),
    range(supabase.from('tips').select('monto, metodo')),
    range(supabase.from('tip_payouts').select('monto')),
    range(supabase.from('expenses').select('total, tipo')),
    range(supabase.from('cash_movements').select('monto, tipo')),
    range(supabase.from('courtesy_items').select('cantidad, costo_unitario, precio_publico')),
    range(supabase.from('product_losses').select('cantidad, costo_unitario, tipo')),
  ])
  const bad = [pays, tips, payouts, exps, cash, corts, losses].find((r) => r.error)
  if (bad) throw new Error('No se pudo calcular el resumen del cierre')

  const ventas = { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 }
  for (const p of pays.data) {
    ventas[p.metodo] += Number(p.monto)
    ventas.total += Number(p.monto)
  }

  const propinas = { recaudadas: 0, efectivo: 0, liquidadas: 0 }
  for (const t of tips.data) {
    propinas.recaudadas += Number(t.monto)
    if (t.metodo === 'efectivo') propinas.efectivo += Number(t.monto)
  }
  propinas.liquidadas = payouts.data.reduce((s, p) => s + Number(p.monto), 0)

  const gastos = { total: 0, hielo: 0, otro: 0, dj: 0 }
  for (const e of exps.data) {
    gastos.total += Number(e.total)
    gastos[e.tipo] = (gastos[e.tipo] || 0) + Number(e.total)
  }

  let base = 0
  let retiros = 0
  for (const m of cash.data) {
    if (m.tipo === 'base') base += Number(m.monto)
    else retiros += Number(m.monto)
  }

  const cortesias = { costo: 0, venta: 0 }
  for (const c of corts.data) {
    cortesias.costo += c.cantidad * Number(c.costo_unitario)
    cortesias.venta += c.cantidad * Number(c.precio_publico)
  }

  let mermasCosto = 0
  let consumoCosto = 0
  for (const l of losses.data) {
    const v = l.cantidad * Number(l.costo_unitario)
    if (l.tipo === 'merma') mermasCosto += v
    else consumoCosto += v
  }

  // Efectivo que deberia haber en la caja
  const efectivoEsperado =
    base + ventas.efectivo + propinas.efectivo - gastos.total - retiros - propinas.liquidadas

  // Neto de caja (dinero): ventas - gastos. Cortesias/mermas/consumo se
  // muestran como control (costo), no entran a este neto.
  const neto = ventas.total - gastos.total

  return { ventas, propinas, gastos, base, retiros, cortesias, mermasCosto, consumoCosto, efectivoEsperado, neto }
}

// ---- Cerrar la jornada ----

export async function closeClosing({ id, openedAt, efectivoContado, notas, empleadoId }) {
  const s = await computeSummary(openedAt, new Date().toISOString())
  const contado = efectivoContado === '' || efectivoContado == null ? null : Number(efectivoContado)
  const diferencia = contado == null ? null : contado - s.efectivoEsperado

  const { error } = await supabase
    .from('cash_closings')
    .update({
      estado: 'cerrada',
      closed_at: new Date().toISOString(),
      closed_by: empleadoId,
      ventas_efectivo: s.ventas.efectivo,
      ventas_tarjeta: s.ventas.tarjeta,
      ventas_transferencia: s.ventas.transferencia,
      ventas_total: s.ventas.total,
      propinas_recaudadas: s.propinas.recaudadas,
      propinas_efectivo: s.propinas.efectivo,
      propinas_liquidadas: s.propinas.liquidadas,
      gastos_total: s.gastos.total,
      base_total: s.base,
      retiros_total: s.retiros,
      cortesias_costo: s.cortesias.costo,
      cortesias_venta: s.cortesias.venta,
      mermas_costo: s.mermasCosto,
      consumo_costo: s.consumoCosto,
      efectivo_esperado: s.efectivoEsperado,
      efectivo_contado: contado,
      diferencia,
      neto: s.neto,
      notas: notas || null,
    })
    .eq('id', id)
  if (error) throw new Error('No se pudo cerrar la jornada')
}

// ---- Reportes ----

// Si se pasa soloEmpleadoId, devuelve unicamente los cierres que ese
// empleado abrio o cerro (para el encargado, que no ve otros dias).
export async function listClosings({ soloEmpleadoId = null, limit = 100 } = {}) {
  let q = supabase
    .from('cash_closings')
    .select('*')
    .eq('estado', 'cerrada')
    .order('closed_at', { ascending: false })
    .limit(limit)
  if (soloEmpleadoId) {
    q = q.or(`opened_by.eq.${soloEmpleadoId},closed_by.eq.${soloEmpleadoId}`)
  }
  const { data, error } = await q
  if (error) throw new Error('No se pudieron cargar los cierres')
  return data ?? []
}
