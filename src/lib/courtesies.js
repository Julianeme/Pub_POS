import { supabase } from './supabase'

// Registra una cortesia (producto regalado). Usa una RPC que lee el precio
// de costo del lado del servidor para no exponerlo a roles no-admin.
export async function addCourtesy({ productId, cantidad, empleadoId }) {
  const { error } = await supabase.rpc('add_courtesy', {
    p_product_id: productId,
    p_cantidad: cantidad,
    p_empleado_id: empleadoId,
  })
  if (error) throw new Error('No se pudo registrar la cortesia')
}
