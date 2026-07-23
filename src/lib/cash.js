import { supabase } from './supabase'

// Movimientos de efectivo en la caja (no son gastos/perdidas):
//  - 'base'   : fondo inicial que entra a la caja
//  - 'retiro' : efectivo que sale de la caja (a la caja fuerte, etc.)
export async function addCashMovement({ tipo, monto, descripcion, empleadoId }) {
  const { error } = await supabase.from('cash_movements').insert({
    tipo,
    monto,
    descripcion,
    empleado_id: empleadoId,
  })
  if (error) throw new Error('No se pudo registrar el movimiento de caja')
}
