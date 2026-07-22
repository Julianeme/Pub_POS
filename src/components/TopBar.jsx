import { Link, useNavigate } from 'react-router-dom'
import { useEmployee } from '../context/EmployeeContext'

const ROL_LABELS = { admin: 'Admin', mesero: 'Mesero', cajero: 'Cajero' }

// Barra superior comun: titulo, accesos de administracion y cierre de sesion.
function TopBar() {
  const { employee, logout } = useEmployee()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-800 px-4 py-3">
      <Link to="/" className="text-xl font-bold text-white">
        POS Bar
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        {employee.rol === 'admin' && (
          <>
            <Link
              to="/admin/mesas"
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Mesas y barra
            </Link>
            <Link
              to="/admin/productos"
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Productos
            </Link>
            <Link
              to="/admin/cortesias"
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Motivos
            </Link>
            <Link
              to="/admin/promociones"
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Promos
            </Link>
            <Link
              to="/admin/empleados"
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Empleados
            </Link>
          </>
        )}
        <span className="px-2 text-sm text-slate-300">
          {employee.nombre} · {ROL_LABELS[employee.rol] ?? employee.rol}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600"
        >
          Salir
        </button>
      </div>
    </header>
  )
}

export default TopBar
