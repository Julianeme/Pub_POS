import { supabase } from './supabase'

// Devuelve el empleado si código+PIN coinciden, o null si no.
// Lanza error solo si falla la consulta (sin conexión, tabla inexistente, etc.).
export async function loginEmployee(codigo, pin) {
  const { data, error } = await supabase
    .from('employees')
    .select('id, nombre, codigo, rol')
    .eq('codigo', codigo)
    .eq('pin', pin)
    .maybeSingle()
  if (error) throw new Error('No se pudo consultar la base de datos')
  return data
}

export async function listEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, nombre, codigo, pin, rol')
    .order('nombre')
  if (error) throw new Error('No se pudo cargar la lista de empleados')
  return data
}

export async function createEmployee({ nombre, codigo, pin, rol }) {
  const { error } = await supabase
    .from('employees')
    .insert({ nombre, codigo, pin, rol })
  if (error) {
    if (error.code === '23505') throw new Error(`El código "${codigo}" ya está en uso`)
    throw new Error('No se pudo crear el empleado')
  }
}

export async function updateEmployee(id, { nombre, codigo, pin, rol }) {
  const { error } = await supabase
    .from('employees')
    .update({ nombre, codigo, pin, rol })
    .eq('id', id)
  if (error) {
    if (error.code === '23505') throw new Error(`El código "${codigo}" ya está en uso`)
    throw new Error('No se pudo actualizar el empleado')
  }
}

export async function deleteEmployee(id) {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el empleado')
}
