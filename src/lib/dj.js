import { supabase } from './supabase'
import { addExpense } from './expenses'
import { addCourtesies } from './courtesies'

// Sesion (cuenta) del DJ residente. Se abre una vez para la noche y se cierra
// cuando se le paga / termina su funcion. No requiere cobro (no es una venta).

export async function getOpenDjSession() {
  const { data, error } = await supabase
    .from('dj_sessions')
    .select('id, nombre_dj, estado, opened_at')
    .eq('estado', 'abierta')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('No se pudo cargar la cuenta del DJ')
  return data
}

export async function openDjSession({ nombreDj, empleadoId }) {
  const { data, error } = await supabase
    .from('dj_sessions')
    .insert({ nombre_dj: nombreDj || null, opened_by: empleadoId })
    .select('id')
    .single()
  if (error) throw new Error('No se pudo abrir la cuenta del DJ')
  return data.id
}

export async function closeDjSession({ id, empleadoId }) {
  const { error } = await supabase
    .from('dj_sessions')
    .update({ estado: 'cerrada', closed_at: new Date().toISOString(), closed_by: empleadoId })
    .eq('id', id)
  if (error) throw new Error('No se pudo cerrar la cuenta del DJ')
}

// Carga los movimientos de la sesion: pagos en efectivo y cortesias (bebidas).
// Las cortesias se muestran a precio de venta (el costo es solo para el cierre).
export async function fetchDjAccount(sessionId) {
  const [pagosRes, cortRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, total, descripcion, created_at')
      .eq('dj_session_id', sessionId)
      .eq('tipo', 'dj')
      .order('created_at'),
    supabase
      .from('courtesy_items')
      .select('id, nombre_producto, cantidad, precio_publico, created_at')
      .eq('dj_session_id', sessionId)
      .order('created_at'),
  ])
  if (pagosRes.error || cortRes.error) {
    throw new Error('No se pudo cargar la cuenta del DJ')
  }
  const pagos = pagosRes.data ?? []
  const cortesias = cortRes.data ?? []
  return {
    pagos,
    cortesias,
    totalEfectivo: pagos.reduce((s, p) => s + Number(p.total), 0),
    totalCortesiaVenta: cortesias.reduce((s, c) => s + c.cantidad * Number(c.precio_publico), 0),
  }
}

export async function addDjPayment({ sessionId, monto, empleadoId }) {
  await addExpense({ tipo: 'dj', monto, descripcion: 'Pago DJ', empleadoId, djSessionId: sessionId })
}

export async function addDjCourtesies({ sessionId, items, empleadoId }) {
  await addCourtesies({ items, empleadoId, motivo: 'DJ residente', djSessionId: sessionId })
}
