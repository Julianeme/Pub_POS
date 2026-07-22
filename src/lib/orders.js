import { supabase } from './supabase'

// ---- helpers ----

const activeItems = (items) => (items ?? []).filter((i) => i.estado === 'activo')

// Precio original de la linea (sin promo)
export const lineOriginal = (item) => item.cantidad * Number(item.precio_unitario)

// Precio efectivo de la linea aplicando la promo congelada al pedir.
// 2x1: se cobra ceil(cantidad / 2) unidades. Debe coincidir con la regla
// del servidor en pay_table_seat / pay_bar_seat (008_promotions.sql).
export const lineTotal = (item) => {
  if (item.promo_tipo === '2x1') {
    return Math.ceil(item.cantidad / 2) * Number(item.precio_unitario)
  }
  return lineOriginal(item)
}

const itemsTotal = (items) => items.reduce((sum, i) => sum + lineTotal(i), 0)

const ITEM_FIELDS =
  'id, nombre_producto, precio_unitario, cantidad, estado, promo_tipo, promo_nombre, created_at'
const COURTESY_FIELDS = 'id, nombre_producto, cantidad, motivo, motivo_detalle, created_at'

const sortByCreated = (arr) =>
  (arr ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))

// ---- lectura (normaliza mesa y barra al mismo formato) ----
// Devuelve: { kind, id, nombre, estado,
//   seats: [{id, nombre, items, courtesies, total}], total }

export async function fetchTableOrder(tableId) {
  const { data, error } = await supabase
    .from('tables')
    .select(
      `id, nombre, estado, table_seats(id, nombre, estado, created_at, order_items(${ITEM_FIELDS}), courtesy_items(${COURTESY_FIELDS}))`
    )
    .eq('id', tableId)
    .single()
  if (error) throw new Error('No se pudo cargar la mesa')

  const seats = (data.table_seats ?? [])
    .filter((s) => s.estado === 'abierto')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((s) => {
      const items = sortByCreated(activeItems(s.order_items))
      return {
        id: s.id,
        nombre: s.nombre,
        items,
        courtesies: sortByCreated(s.courtesy_items),
        total: itemsTotal(items),
      }
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
    .select(
      `id, nombre, nombre_cliente, estado, order_items(${ITEM_FIELDS}), courtesy_items(${COURTESY_FIELDS})`
    )
    .eq('id', seatId)
    .single()
  if (error) throw new Error('No se pudo cargar el puesto')

  const items = sortByCreated(activeItems(data.order_items))
  const seat = {
    id: data.id,
    nombre: data.nombre_cliente ?? data.nombre,
    items,
    courtesies: sortByCreated(data.courtesy_items),
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

// Agrega varios productos al pedido en una sola operacion.
// items: [{ product, cantidad }, ...]
export async function addOrderItems({ tableSeatId = null, barSeatId = null, items, empleadoId }) {
  const rows = items
    .filter((it) => it.cantidad > 0)
    .map(({ product, cantidad, promoTipo = null, promoNombre = null }) => ({
      table_seat_id: tableSeatId,
      bar_seat_id: barSeatId,
      product_id: product.id,
      nombre_producto: product.nombre,
      precio_unitario: product.precio_publico,
      cantidad,
      promo_tipo: promoTipo,
      promo_nombre: promoNombre,
      empleado_id: empleadoId,
    }))
  if (rows.length === 0) return
  const { error } = await supabase.from('order_items').insert(rows)
  if (error) throw new Error('No se pudieron agregar los productos')
}

// Anula (no borra): conserva historial para auditoria y cierre de caja
export async function voidOrderItem(id) {
  const { error } = await supabase
    .from('order_items')
    .update({ estado: 'anulado' })
    .eq('id', id)
  if (error) throw new Error('No se pudo quitar el item')
}

// Corrige la cantidad de un item mientras la cuenta sigue abierta (ej. se
// pidieron 6 cervezas y eran 5). No es una anulacion: es la misma fila,
// mismo precio_unitario y mismo empleado que la registro; solo cambia la
// cantidad. Si baja a 0, se trata como quitar el item (anulado).
export async function updateOrderItemQuantity(id, cantidad) {
  if (cantidad < 1) return voidOrderItem(id)
  const { error } = await supabase
    .from('order_items')
    .update({ cantidad })
    .eq('id', id)
    .eq('estado', 'activo')
  if (error) throw new Error('No se pudo actualizar la cantidad')
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

  // Desligar cortesias del puesto para que no reaparezcan al reabrirlo
  // (se conserva el registro). Ver nota en 007_courtesy_reasons.sql.
  const { error: e2 } = await supabase
    .from('courtesy_items')
    .update({ bar_seat_id: null })
    .eq('bar_seat_id', seatId)
  if (e2) throw new Error('No se pudieron desligar las cortesias')

  const { error: e3 } = await supabase
    .from('bar_seats')
    .update({ estado: 'libre', nombre_cliente: null })
    .eq('id', seatId)
  if (e3) throw new Error('No se pudo liberar el puesto')
}
