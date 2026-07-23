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

// Gasto generico de dinero (otro gasto, DJ residente, etc.): un monto total
// con descripcion. tipo identifica el rubro para el cierre ('otro', 'dj').
export async function addExpense({ tipo, monto, descripcion, empleadoId }) {
  const { error } = await supabase.from('expenses').insert({
    tipo,
    descripcion,
    cantidad: 1,
    costo_unitario: monto,
    total: monto,
    empleado_id: empleadoId,
  })
  if (error) throw new Error('No se pudo registrar el gasto')
}
