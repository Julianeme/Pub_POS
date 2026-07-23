import { supabase } from './supabase'

// ---- helpers ----

const activeItems = (items) => (items ?? []).filter((i) => i.estado === 'activo')

// Precio original de la linea (sin promo)
export const lineOriginal = (item) => item.cantidad * Number(item.precio_unitario)

// Precio efectivo de la linea SIN agrupar. 2x1 -> cobra ceil(cantidad/2)
// unidades. Porcentaje -> aplica el % de descuento a la linea completa.
export const lineTotal = (item) => {
  if (item.promo_tipo === '2x1') {
    return Math.ceil(item.cantidad / 2) * Number(item.precio_unitario)
  }
  if (item.promo_tipo === 'porcentaje') {
    return Math.round(lineOriginal(item) * (1 - Number(item.promo_valor) / 100))
  }
  return lineOriginal(item)
}

const groupKey = (item) => `${item.product_id}|${item.precio_unitario}`

// Calcula, para cada producto en promo 2x1, cuanto paga CADA sub-cuenta,
// respetando la prioridad pedida:
//   1o) cada sub-cuenta aprovecha sus propios pares 2x1 (por cada 2 unidades
//       propias, paga 1),
//   2o) las unidades "impares" sobrantes de distintas sub-cuentas se
//       emparejan entre si y cada una de ese par paga la mitad,
//   3o) si queda un impar sin pareja, paga completo.
// occSeatsSorted: sub-cuentas de la ocupacion, ordenadas por created_at.
// Devuelve: { [productKey]: { units: Map(seatId->unidades), charge: Map(seatId->monto) } }
function buildGroupedCharges(occSeatsSorted) {
  const perKey = {}
  for (const s of occSeatsSorted) {
    for (const it of s.order_items ?? []) {
      if (it.promo_tipo === '2x1' && (it.estado === 'activo' || it.estado === 'pagado')) {
        const k = groupKey(it)
        perKey[k] ??= { price: Number(it.precio_unitario), units: new Map() }
        perKey[k].units.set(s.id, (perKey[k].units.get(s.id) || 0) + it.cantidad)
      }
    }
  }

  const result = {}
  for (const [k, info] of Object.entries(perKey)) {
    const { price, units } = info
    // sub-cuentas con cantidad impar (tienen una unidad sobrante), en orden
    const oddSeatIds = occSeatsSorted
      .filter((s) => (units.get(s.id) || 0) % 2 === 1)
      .map((s) => s.id)
    const crossPaired = 2 * Math.floor(oddSeatIds.length / 2) // cuantos impares se emparejan

    const charge = new Map()
    for (const s of occSeatsSorted) {
      const q = units.get(s.id) || 0
      if (q === 0) continue
      let c = Math.floor(q / 2) * price // pares propios: paga 1 por cada 2
      if (q % 2 === 1) {
        const rank = oddSeatIds.indexOf(s.id) + 1 // 1-based
        c += rank <= crossPaired ? price / 2 : price // emparejado -> mitad; solo -> completo
      }
      charge.set(s.id, c)
    }
    result[k] = { units, charge }
  }
  return result
}

const ITEM_FIELDS =
  'id, product_id, nombre_producto, precio_unitario, cantidad, estado, promo_tipo, promo_nombre, promo_valor, created_at'
const COURTESY_FIELDS = 'id, nombre_producto, cantidad, motivo, motivo_detalle, created_at'

const sortByCreated = (arr) =>
  (arr ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))

// Adjunta item.charged (precio efectivo) segun la funcion de precio dada,
// y devuelve el total de la lista.
const withCharged = (items, priceFn) => {
  let total = 0
  for (const it of items) {
    it.charged = priceFn(it)
    total += it.charged
  }
  return total
}

// ---- lectura (normaliza mesa y barra al mismo formato) ----
// Devuelve: { kind, id, nombre, estado,
//   seats: [{id, nombre, items, courtesies, total}], total }
// Cada item lleva .charged (precio efectivo ya con promo).

export async function fetchTableOrder(tableId) {
  const { data, error } = await supabase
    .from('tables')
    .select(
      `id, nombre, estado, opened_at, agrupar_promos, table_seats(id, nombre, estado, created_at, order_items(${ITEM_FIELDS}), courtesy_items(${COURTESY_FIELDS}))`
    )
    .eq('id', tableId)
    .single()
  if (error) throw new Error('No se pudo cargar la mesa')

  const agrupar = data.agrupar_promos
  const openedAt = data.opened_at
  const allSeats = data.table_seats ?? []

  // Sub-cuentas de la ocupacion actual (creadas desde opened_at), ordenadas
  const occSeatsSorted = allSeats
    .filter((s) => !openedAt || s.created_at >= openedAt)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  const grouped = agrupar ? buildGroupedCharges(occSeatsSorted) : null

  // Precio efectivo de una linea. Con agrupacion, reparte el cargo del
  // producto (a nivel sub-cuenta) entre las lineas de esa sub-cuenta.
  const chargedForItem = (it, seatId) => {
    // Porcentaje y sin promo: por linea. El agrupamiento solo aplica al 2x1.
    if (it.promo_tipo !== '2x1') return lineTotal(it)
    if (!agrupar) return lineTotal(it)
    const info = grouped[groupKey(it)]
    const q = info?.units.get(seatId)
    const c = info?.charge.get(seatId)
    if (!q || c == null) return lineTotal(it)
    return Math.round((c * it.cantidad) / q)
  }

  const seats = allSeats
    .filter((s) => s.estado === 'abierto')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((s) => {
      const items = sortByCreated(activeItems(s.order_items))
      let total = 0
      for (const it of items) {
        it.charged = chargedForItem(it, s.id)
        total += it.charged
      }
      return {
        id: s.id,
        nombre: s.nombre,
        items,
        courtesies: sortByCreated(s.courtesy_items),
        total,
      }
    })

  return {
    kind: 'mesa',
    id: data.id,
    nombre: data.nombre,
    estado: data.estado,
    agruparPromos: agrupar,
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

  // La barra es un solo consumidor: 2x1 por linea (sin agrupar).
  const items = sortByCreated(activeItems(data.order_items))
  const seat = {
    id: data.id,
    nombre: data.nombre_cliente ?? data.nombre,
    items,
    courtesies: sortByCreated(data.courtesy_items),
    total: withCharged(items, lineTotal),
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
    .map(({ product, cantidad, promoTipo = null, promoNombre = null, promoValor = null }) => ({
      table_seat_id: tableSeatId,
      bar_seat_id: barSeatId,
      product_id: product.id,
      nombre_producto: product.nombre,
      precio_unitario: product.precio_publico,
      cantidad,
      promo_tipo: promoTipo,
      promo_nombre: promoNombre,
      promo_valor: promoValor,
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
