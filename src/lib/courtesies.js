import { supabase } from './supabase'

// Registra una cortesia (producto regalado). Usa una RPC que lee el precio
// de costo del lado del servidor para no exponerlo a roles no-admin.
// Puede ligarse a una sub-cuenta de mesa (tableSeatId) o a un puesto de
// barra (barSeatId); si ambos van null, es una cortesia global.
export async function addCourtesy({
  productId,
  cantidad,
  empleadoId,
  motivo = null,
  motivoDetalle = null,
  tableSeatId = null,
  barSeatId = null,
}) {
  const { error } = await supabase.rpc('add_courtesy', {
    p_product_id: productId,
    p_cantidad: cantidad,
    p_empleado_id: empleadoId,
    p_motivo: motivo,
    p_motivo_detalle: motivoDetalle,
    p_table_seat_id: tableSeatId,
    p_bar_seat_id: barSeatId,
  })
  if (error) throw new Error('No se pudo registrar la cortesia')
}

// ---- Motivos precargados (administrables por el admin) ----

export async function listCourtesyReasons() {
  const { data, error } = await supabase
    .from('courtesy_reasons')
    .select('id, nombre')
    .eq('activo', true)
    .order('orden')
    .order('nombre')
  if (error) throw new Error('No se pudieron cargar los motivos de cortesia')
  return data
}

export async function listCourtesyReasonsAdmin() {
  const { data, error } = await supabase
    .from('courtesy_reasons')
    .select('id, nombre, orden, activo')
    .order('orden')
    .order('nombre')
  if (error) throw new Error('No se pudieron cargar los motivos')
  return data
}

export async function addCourtesyReason(nombre) {
  // Coloca el nuevo motivo al final
  const { data: last } = await supabase
    .from('courtesy_reasons')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()
  const orden = (last?.orden ?? 0) + 1
  const { error } = await supabase.from('courtesy_reasons').insert({ nombre, orden })
  if (error) {
    if (error.code === '23505') throw new Error(`El motivo "${nombre}" ya existe`)
    throw new Error('No se pudo agregar el motivo')
  }
}

export async function deleteCourtesyReason(id) {
  const { error } = await supabase.from('courtesy_reasons').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el motivo')
}
