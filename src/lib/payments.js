import { supabase } from './supabase'

export const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
]

// El monto se calcula en el frontend (orders.js, con el 2x1 agrupado y su
// prioridad) y se pasa al servidor, que solo registra el pago y cambia
// estados. Asi "lo mostrado == lo cobrado" sin duplicar la logica.

export async function payTableSeat(seatId, metodo, empleadoId, monto) {
  const { error } = await supabase.rpc('pay_table_seat', {
    p_seat_id: seatId,
    p_metodo: metodo,
    p_empleado_id: empleadoId,
    p_monto: monto,
  })
  if (error) throw new Error('No se pudo registrar el cobro de la sub-cuenta')
}

// Cobra toda la mesa: paga cada sub-cuenta abierta con su propio monto
// (respeta el reparto del 2x1 agrupado). La ultima en pagarse libera la mesa.
export async function payWholeTable(seats, metodo, empleadoId) {
  for (const s of seats) {
    await payTableSeat(s.id, metodo, empleadoId, s.total)
  }
}

export async function payBarSeat(seatId, metodo, empleadoId, monto) {
  const { error } = await supabase.rpc('pay_bar_seat', {
    p_seat_id: seatId,
    p_metodo: metodo,
    p_empleado_id: empleadoId,
    p_monto: monto,
  })
  if (error) throw new Error('No se pudo registrar el cobro del puesto')
}
