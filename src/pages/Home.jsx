import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checkConnection } from '../lib/supabase'
import { useEmployee } from '../context/EmployeeContext'

const ROL_LABELS = { admin: 'Administrador', mesero: 'Mesero', cajero: 'Cajero' }

function Home() {
  const { employee, logout } = useEmployee()
  const navigate = useNavigate()

  const [status, setStatus] = useState({ state: 'loading', message: 'Conectando...' })

  useEffect(() => {
    let cancelled = false
    checkConnection().then((result) => {
      if (cancelled) return
      setStatus({
        state: result.ok ? 'connected' : 'error',
        message: result.message,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const colors = {
    loading: 'bg-yellow-500',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 p-6">
      <h1 className="text-4xl font-bold text-white">POS Bar</h1>

      <div className="text-center">
        <p className="text-xl text-white">Hola, {employee.nombre}</p>
        <p className="text-slate-400">{ROL_LABELS[employee.rol] ?? employee.rol}</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {employee.rol === 'admin' && (
          <Link
            to="/admin/empleados"
            className="rounded-xl bg-blue-600 py-4 text-center text-lg font-semibold text-white hover:bg-blue-500"
          >
            Empleados
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className={`h-2 w-2 rounded-full ${colors[status.state]}`} />
        Supabase: {status.message}
      </div>
    </main>
  )
}

export default Home
