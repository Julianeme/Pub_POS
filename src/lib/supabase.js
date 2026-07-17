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
 * Verifica la conexión con Supabase consultando la raíz de la API REST.
 * Responde 200 si la URL y la anon key son válidas (no requiere tablas).
 */
export async function checkConnection() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, message: 'Faltan variables de entorno (.env)' }
  }
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })
    if (res.ok) {
      return { ok: true, message: 'Conectado' }
    }
    return { ok: false, message: `Error ${res.status}: revisa la URL y la anon key` }
  } catch {
    return { ok: false, message: 'Sin respuesta: revisa la URL o tu conexión a internet' }
  }
}
