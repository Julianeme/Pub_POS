import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y completa los valores de tu proyecto Supabase.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

/**
 * Verifica la conexión con Supabase haciendo una consulta liviana (solo
 * conteo, sin traer filas) a la tabla employees.
 */
export async function checkConnection() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, message: 'Faltan variables de entorno (.env)' }
  }
  try {
    const { error } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
    if (error) {
      return { ok: false, message: 'Error: revisa la URL, la anon key o que la tabla exista' }
    }
    return { ok: true, message: 'Conectado' }
  } catch {
    return { ok: false, message: 'Sin respuesta: revisa la URL o tu conexión a internet' }
  }
}
