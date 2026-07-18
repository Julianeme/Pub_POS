import { supabase } from './supabase'

// ---- helpers ----

const activeItems = (items) => (items ?? []).filter((i) => i.estado === 'activo')

const itemsTotal = (items) =>
  items.reduce((sum, i) => sum + i.cantidad * Number(i.precio_unitario), 0)

const ITEM_FIELDS = 'id, nombre_producto, precio_unitario, cantidad, estado, created_at'

// ---- lectura (normaliza mesa y barra al mismo formato) ----
// Devuelve: { kind, id, nombre, estado, seats: [{id, nombre, items, total}], total }

export async function fetchTableOrder(tableId) {
  const { data, error } = await supabase
    .from('tables')
    .select(`id, nombre, estado, table_seats(id, nombre, estado, created_at, order_items(${ITEM_FIELDS}))`)
    .eq('id', tableId)
    .single()
  if (error) throw new Error('No se pudo cargar la mesa')

  const seats = (data.table_seats ?? [])
    .filter((s) => s.estado === 'abierto')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((s) => {
      const items = activeItems(s.order_items).sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      )
      return { id: s.id, nombre: s.nombre, items, total: itemsTotal(items) }
    })

  return {
    kind: 'mesa',
    id: data.id,
    nombre: data.nombre,
    estado: data.estado,
    seats,
    total: seats.reduce((sum, s) => sum + s.total, 0),
  }
}

export async function fetchBarSeatOrder(seatId) {
  const { data, error } = await supabase
    .from('bar_seats')
    .select(`id, nombre, nombre_cliente, estado, order_items(${ITEM_FIELDS})`)
    .eq('id', seatId)
    .single()
  if (error) throw new Error('No se pudo cargar el puesto')

  const items = activeItems(data.order_items).sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  )
  const seat = {
    id: data.id,
    nombre: data.nombre_cliente ?? data.nombre,
    items,
    total: itemsTotal(items),
  }

  return {
    kind: 'barra',
    id: data.id,
    nombre: data.nombre,
    estado: data.estado,
    seats: data.estado === 'ocupado' ? [seat] : [],
    total: seat.total,
  }
}

// ---- items ----

export async function addOrderItem({ tableSeatId = null, barSeatId = null, product, cantidad, empleadoId }) {
  const { error } = await supabase.from('order_items').insert({
    table_seat_id: tableSeatId,
    bar_seat_id: barSeatId,
    product_id: product.id,
    nombre_producto: product.nombre,
    precio_unitario: product.precio_publico,
    cantidad,
    empleado_id: empleadoId,
  })
  if (error) throw new Error('No se pudo agregar el producto')
}

// Anula (no borra): conserva historial para auditoria y cierre de caja
export async function voidOrderItem(id) {
  const { error } = await supabase
    .from('order_items')
    .update({ estado: 'anulado' })
    .eq('id', id)
  if (error) throw new Error('No se pudo quitar el item')
}

// ---- sub-cuentas de mesa ----

export async function addTableSeat(tableId, nombre) {
  const { error } = await supabase
    .from('table_seats')
    .insert({ table_id: tableId, nombre })
  if (error) throw new Error('No se pudo agregar la sub-cuenta')
}

export async function renameTableSeat(id, nombre) {
  const { error } = await supabase.from('table_seats').update({ nombre }).eq('id', id)
  if (error) throw new Error('No se pudo renombrar la sub-cuenta')
}

// ---- liberar sin cobrar (PROVISIONAL hasta la Fase 5) ----
// Anula el consumo activo, cancela las sub-cuentas y libera la mesa/puesto.

export async function cancelTable(tableId) {
  const { data: seats, error } = await supabase
    .from('table_seats')
    .select('id')
    .eq('table_id', tableId)
    .eq('estado', 'abierto')
  if (error) throw new Error('No se pudo liberar la mesa')

  const ids = seats.map((s) => s.id)
  if (ids.length > 0) {
    const { error: e1 } = await supabase
      .from('order_items')
      .update({ estado: 'anulado' })
      .in('table_seat_id', ids)
      .eq('estado', 'activo')
    if (e1) throw new Error('No se pudo anular el consumo')

    const { error: e2 } = await supabase
      .from('table_seats')
      .update({ estado: 'cancelado' })
      .in('id', ids)
    if (e2) throw new Error('No se pudieron cerrar las sub-cuentas')
  }

  const { error: e3 } = await supabase
    .from('tables')
    .update({ estado: 'libre' })
    .eq('id', tableId)
  if (e3) throw new Error('No se pudo liberar la mesa')
}

export async function cancelBarSeat(seatId) {
  const { error: e1 } = await supabase
    .from('order_items')
    .update({ estado: 'anulado' })
    .eq('bar_seat_id', seatId)
    .eq('estado', 'activo')
  if (e1) throw new Error('No se pudo anular el consumo')

  const { error: e2 } = await supabase
    .from('bar_seats')
    .update({ estado: 'libre', nombre_cliente: null })
    .eq('id', seatId)
  if (e2) throw new Error('No se pudo liberar el puesto')
}
