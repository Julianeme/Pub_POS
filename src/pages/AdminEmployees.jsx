import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEmployee } from '../context/EmployeeContext'
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../lib/employees'

const EMPTY_FORM = { nombre: '', codigo: '', pin: '', rol: 'mesero' }

const ROL_LABELS = { admin: 'Admin', mesero: 'Mesero', cajero: 'Cajero' }

function AdminEmployees() {
  const { employee: current } = useEmployee()

  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // editing: null (cerrado) | 'new' | id del empleado en edición
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      setEmployees(await listEmployees())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setEditing('new')
  }

  const openEdit = (emp) => {
    setForm({ nombre: emp.nombre, codigo: emp.codigo, pin: emp.pin, rol: emp.rol })
    setFormError('')
    setEditing(emp.id)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const { nombre, codigo, pin } = form
    if (!nombre.trim() || !codigo.trim() || !pin.trim()) {
      setFormError('Todos los campos son obligatorios')
      return
    }
    if (!/^\d+$/.test(codigo) || !/^\d+$/.test(pin)) {
      setFormError('Código y PIN deben ser solo números')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editing === 'new') {
        await createEmployee({ ...form, nombre: nombre.trim() })
      } else {
        await updateEmployee(editing, { ...form, nombre: nombre.trim() })
      }
      setEditing(null)
      await refresh()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (emp) => {
    if (emp.id === current.id) return
    if (!window.confirm(`¿Eliminar a ${emp.nombre} (código ${emp.codigo})?`)) return
    try {
      await deleteEmployee(emp.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const inputClass =
    'w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 ' +
    'outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link to="/" className="text-sm text-slate-400 hover:text-white">
              ← Volver al inicio
            </Link>
            <h1 className="text-2xl font-bold text-white">Empleados</h1>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
          >
            + Nuevo
          </button>
        </div>

        {error && <p className="mb-4 font-medium text-red-400">{error}</p>}
        {loading && <p className="text-slate-400">Cargando...</p>}

        {!loading && !error && employees.length === 0 && (
          <p className="text-slate-400">No hay empleados registrados.</p>
        )}

        <ul className="space-y-3">
          {employees.map((emp) => (
            <li
              key={emp.id}
              className="flex items-center justify-between rounded-xl bg-slate-800 px-5 py-4"
            >
              <div>
                <p className="font-semibold text-white">
                  {emp.nombre}
                  {emp.id === current.id && (
                    <span className="ml-2 text-xs text-green-400">(tú)</span>
                  )}
                </p>
                <p className="text-sm text-slate-400">
                  Código {emp.codigo} · {ROL_LABELS[emp.rol] ?? emp.rol}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(emp)}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(emp)}
                  disabled={emp.id === current.id}
                  className="rounded-lg bg-red-900/60 px-4 py-2 text-red-200 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal de crear/editar */}
      {editing !== null && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md space-y-4 rounded-2xl bg-slate-800 p-6"
          >
            <h2 className="text-xl font-bold text-white">
              {editing === 'new' ? 'Nuevo empleado' : 'Editar empleado'}
            </h2>

            <input
              className={inputClass}
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Código (ej. 0002)"
              inputMode="numeric"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="PIN"
              inputMode="numeric"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
            />
            <select
              className={inputClass}
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="mesero">Mesero</option>
              <option value="cajero">Cajero</option>
            </select>

            {formError && <p className="font-medium text-red-400">{formError}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}

export default AdminEmployees
