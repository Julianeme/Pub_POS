import { supabase } from './supabase'

export const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
]

// Cada cobro llama a una funcion RPC que hace todo el trabajo de forma
// atomica en el servidor (ver 005_payments.sql).

export async function payTableSeat(seatId, metodo, empleadoId) {
  const { error } = await supabase.rpc('pay_table_seat', {
    p_seat_id: seatId,
    p_metodo: metodo,
    p_empleado_id: empleadoId,
  })
  if (error) throw new Error('No se pudo registrar el cobro de la sub-cuenta')
}

export async function payTable(tableId, metodo, empleadoId) {
  const { error } = await supabase.rpc('pay_table', {
    p_table_id: tableId,
    p_metodo: metodo,
    p_empleado_id: empleadoId,
  })
  if (error) throw new Error('No se pudo registrar el cobro de la mesa')
}

export async function payBarSeat(seatId, metodo, empleadoId) {
  const { error } = await supabase.rpc('pay_bar_seat', {
    p_seat_id: seatId,
    p_metodo: metodo,
    p_empleado_id: empleadoId,
  })
  if (error) throw new Error('No se pudo registrar el cobro del puesto')
}
