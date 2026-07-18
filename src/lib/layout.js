import { supabase } from './supabase'

// ---- Lectura del mapa (pisos con sus mesas + puestos de barra) ----

export async function fetchLayout() {
  const [floorsRes, barRes] = await Promise.all([
    supabase
      .from('floors')
      .select('id, nombre, orden, tables(id, nombre, estado, orden)')
      .order('orden')
      .order('orden', { referencedTable: 'tables' }),
    supabase.from('bar_seats').select('id, nombre, nombre_cliente, estado, orden').order('orden'),
  ])
  if (floorsRes.error || barRes.error) {
    throw new Error('No se pudo cargar el mapa del bar (¿ejecutaste el SQL de la Fase 2?)')
  }
  return { floors: floorsRes.data, barSeats: barRes.data }
}

// ---- Mesas ----

export async function openTable(id) {
  const { error } = await supabase.from('tables').update({ estado: 'ocupada' }).eq('id', id)
  if (error) throw new Error('No se pudo abrir la mesa')
}

// Provisional: liberar manualmente. En la fase de cobro esto pasara a ser
// automatico cuando todas las sub-cuentas esten pagadas.
export async function freeTable(id) {
  const { error } = await supabase.from('tables').update({ estado: 'libre' }).eq('id', id)
  if (error) throw new Error('No se pudo liberar la mesa')
}

export async function addTable(floorId, nombre, orden) {
  const { error } = await supabase
    .from('tables')
    .insert({ floor_id: floorId, nombre, orden })
  if (error) throw new Error('No se pudo agregar la mesa')
}

export async function deleteTable(id) {
  const { error } = await supabase.from('tables').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar la mesa')
}

// ---- Puestos de barra ----

export async function occupyBarSeat(id, nombreCliente) {
  const { error } = await supabase
    .from('bar_seats')
    .update({ estado: 'ocupado', nombre_cliente: nombreCliente })
    .eq('id', id)
  if (error) throw new Error('No se pudo ocupar el puesto')
}

export async function renameBarSeatClient(id, nombreCliente) {
  const { error } = await supabase
    .from('bar_seats')
    .update({ nombre_cliente: nombreCliente })
    .eq('id', id)
  if (error) throw new Error('No se pudo cambiar el nombre')
}

export async function freeBarSeat(id) {
  const { error } = await supabase
    .from('bar_seats')
    .update({ estado: 'libre', nombre_cliente: null })
    .eq('id', id)
  if (error) throw new Error('No se pudo liberar el puesto')
}

export async function addBarSeat(nombre, orden) {
  const { error } = await supabase.from('bar_seats').insert({ nombre, orden })
  if (error) throw new Error('No se pudo agregar el puesto')
}

export async function deleteBarSeat(id) {
  const { error } = await supabase.from('bar_seats').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el puesto')
}
