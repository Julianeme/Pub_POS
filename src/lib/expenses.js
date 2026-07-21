import { supabase } from './supabase'

// Registra una compra de hielo (gasto tipo 'hielo'). El total se calcula
// aqui y tambien se valida en la BD (check total >= 0).
export async function addIceExpense({ cantidad, costoUnitario, empleadoId }) {
  const total = cantidad * costoUnitario
  const { error } = await supabase.from('expenses').insert({
    tipo: 'hielo',
    cantidad,
    costo_unitario: costoUnitario,
    total,
    empleado_id: empleadoId,
  })
  if (error) throw new Error('No se pudo registrar la compra de hielo')
}
