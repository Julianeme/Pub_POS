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

// Abre la mesa y crea su primera sub-cuenta ("Cliente 1").
// opened_at delimita esta ocupacion (para agrupar promos solo de esta sesion).
export async function openTable(id) {
  const { error } = await supabase
    .from('tables')
    .update({ estado: 'ocupada', opened_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error('No se pudo abrir la mesa')
  const { error: e2 } = await supabase
    .from('table_seats')
    .insert({ table_id: id, nombre: 'Cliente 1' })
  if (e2) throw new Error('No se pudo crear la sub-cuenta inicial')
}

// Interruptor por mesa: agrupar el 2x1 al nivel de toda la mesa
export async function setTableGroupPromos(id, value) {
  const { error } = await supabase
    .from('tables')
    .update({ agrupar_promos: value })
    .eq('id', id)
  if (error) throw new Error('No se pudo cambiar el agrupamiento de promos')
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

export async function addBarSeat(nombre, orden) {
  const { error } = await supabase.from('bar_seats').insert({ nombre, orden })
  if (error) throw new Error('No se pudo agregar el puesto')
}

export async function deleteBarSeat(id) {
  const { error } = await supabase.from('bar_seats').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el puesto')
}
