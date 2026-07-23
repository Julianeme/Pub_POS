import { supabase } from './supabase'

const CAMPOS = 'id, nombre, codigo, rol, puede_dar_cortesia, cortesia_hasta'

// Login seguro: valida el PIN (hasheado) del lado del servidor.
export async function loginEmployee(codigo, pin) {
  const { data, error } = await supabase.rpc('login_employee', {
    p_codigo: codigo,
    p_pin: pin,
  })
  if (error) throw new Error('No se pudo consultar la base de datos')
  return (data && data[0]) || null
}

export async function listEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(CAMPOS)
    .order('nombre')
  if (error) throw new Error('No se pudo cargar la lista de empleados')
  return data
}

function mapUpsertError(error, codigo) {
  if (error.message && error.message.includes('codigo_duplicado')) {
    return new Error(`El código "${codigo}" ya está en uso`)
  }
  return new Error('No se pudo guardar el empleado')
}

export async function createEmployee({ nombre, codigo, pin, rol, puedeDarCortesia, cortesiaHasta }) {
  const { error } = await supabase.rpc('upsert_employee', {
    p_id: null,
    p_nombre: nombre,
    p_codigo: codigo,
    p_rol: rol,
    p_puede_cortesia: puedeDarCortesia ?? false,
    p_cortesia_hasta: cortesiaHasta || null,
    p_pin: pin,
  })
  if (error) throw mapUpsertError(error, codigo)
}

// pin vacio en edicion = no cambiar el PIN.
export async function updateEmployee(id, { nombre, codigo, pin, rol, puedeDarCortesia, cortesiaHasta }) {
  const { error } = await supabase.rpc('upsert_employee', {
    p_id: id,
    p_nombre: nombre,
    p_codigo: codigo,
    p_rol: rol,
    p_puede_cortesia: puedeDarCortesia ?? false,
    p_cortesia_hasta: cortesiaHasta || null,
    p_pin: pin || null,
  })
  if (error) throw mapUpsertError(error, codigo)
}

export async function deleteEmployee(id) {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el empleado')
}
