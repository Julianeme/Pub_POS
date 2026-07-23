import { supabase } from './supabase'

const CAMPOS = 'id, nombre, codigo, rol, puede_dar_cortesia, cortesia_hasta'

// Devuelve el empleado si código+PIN coinciden, o null si no.
// Lanza error solo si falla la consulta (sin conexión, tabla inexistente, etc.).
export async function loginEmployee(codigo, pin) {
  const { data, error } = await supabase
    .from('employees')
    .select(CAMPOS)
    .eq('codigo', codigo)
    .eq('pin', pin)
    .maybeSingle()
  if (error) throw new Error('No se pudo consultar la base de datos')
  return data
}

export async function listEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(`${CAMPOS}, pin`)
    .order('nombre')
  if (error) throw new Error('No se pudo cargar la lista de empleados')
  return data
}

export async function createEmployee({ nombre, codigo, pin, rol, puedeDarCortesia, cortesiaHasta }) {
  const { error } = await supabase.from('employees').insert({
    nombre,
    codigo,
    pin,
    rol,
    puede_dar_cortesia: puedeDarCortesia ?? false,
    cortesia_hasta: cortesiaHasta || null,
  })
  if (error) {
    if (error.code === '23505') throw new Error(`El código "${codigo}" ya está en uso`)
    throw new Error('No se pudo crear el empleado')
  }
}

export async function updateEmployee(id, { nombre, codigo, pin, rol, puedeDarCortesia, cortesiaHasta }) {
  const { error } = await supabase
    .from('employees')
    .update({
      nombre,
      codigo,
      pin,
      rol,
      puede_dar_cortesia: puedeDarCortesia ?? false,
      cortesia_hasta: cortesiaHasta || null,
    })
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
