import { supabase } from './supabase'

export const CATEGORIAS = [
  { value: 'coctel', label: 'Cocteles' },
  { value: 'bebida', label: 'Bebidas' },
  { value: 'otro', label: 'Otros' },
]

// Solo admin: incluye precio_costo.
export async function listProductsAdmin() {
  const { data, error } = await supabase
    .from('products')
    .select('id, nombre, categoria, precio_publico, precio_costo, activo')
    .order('categoria')
    .order('nombre')
  if (error) throw new Error('No se pudo cargar el catalogo (¿ejecutaste el SQL de la Fase 3?)')
  return data
}

// Para meseros/pantalla de pedidos (Fase 4): SIN precio_costo y solo activos.
export async function listActiveProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, nombre, categoria, precio_publico')
    .eq('activo', true)
    .order('categoria')
    .order('nombre')
  if (error) throw new Error('No se pudo cargar el catalogo')
  return data
}

export async function createProduct({ nombre, categoria, precio_publico, precio_costo }) {
  const { error } = await supabase
    .from('products')
    .insert({ nombre, categoria, precio_publico, precio_costo })
  if (error) throw new Error('No se pudo crear el producto')
}

export async function updateProduct(id, { nombre, categoria, precio_publico, precio_costo }) {
  const { error } = await supabase
    .from('products')
    .update({ nombre, categoria, precio_publico, precio_costo })
    .eq('id', id)
  if (error) throw new Error('No se pudo actualizar el producto')
}

export async function setProductActive(id, activo) {
  const { error } = await supabase.from('products').update({ activo }).eq('id', id)
  if (error) throw new Error('No se pudo cambiar el estado del producto')
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el producto')
}
