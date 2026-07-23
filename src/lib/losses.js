import { supabase } from './supabase'

// Motivos rapidos mas comunes de merma/rotura (chips, para minimizar teclado)
export const MERMA_MOTIVOS = [
  'Derrame',
  'Rotura',
  'Mala calidad',
  'Error en despacho',
  'Vencido',
]

// Salida de producto sin venta: 'merma' (rotura/desperdicio) o
// 'consumo_interno' (personal). El costo se lee en el servidor (RPC).
export async function addProductLoss({ tipo, productId, cantidad, descripcion, empleadoId }) {
  const { error } = await supabase.rpc('add_product_loss', {
    p_tipo: tipo,
    p_product_id: productId,
    p_cantidad: cantidad,
    p_empleado_id: empleadoId,
    p_descripcion: descripcion ?? null,
  })
  if (error) throw new Error('No se pudo registrar la salida de producto')
}
