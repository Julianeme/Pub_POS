import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CATEGORIAS,
  listProductsAdmin,
  createProduct,
  updateProduct,
  setProductActive,
  deleteProduct,
} from '../lib/products'
import { money } from '../lib/format'
import { useConfirm } from '../components/ConfirmModal'

const EMPTY_FORM = { nombre: '', categoria: 'coctel', precio_publico: '', precio_costo: '' }

// Catalogo de productos (solo admin). El precio de costo solo se ve aqui.
function AdminProducts() {
  const { confirm, confirmModal } = useConfirm()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // editing: null (cerrado) | 'new' | id del producto en edicion
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      setProducts(await listProductsAdmin())
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

  const openEdit = (p) => {
    setForm({
      nombre: p.nombre,
      categoria: p.categoria,
      precio_publico: String(p.precio_publico),
      precio_costo: String(p.precio_costo),
    })
    setFormError('')
    setEditing(p.id)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const nombre = form.nombre.trim()
    const precioPublico = Number(form.precio_publico)
    const precioCosto = Number(form.precio_costo || 0)
    if (!nombre) {
      setFormError('El nombre es obligatorio')
      return
    }
    if (!form.precio_publico || Number.isNaN(precioPublico) || precioPublico < 0) {
      setFormError('Precio publico invalido')
      return
    }
    if (Number.isNaN(precioCosto) || precioCosto < 0) {
      setFormError('Precio de costo invalido')
      return
    }
    setSaving(true)
    setFormError('')
    const payload = {
      nombre,
      categoria: form.categoria,
      precio_publico: precioPublico,
      precio_costo: precioCosto,
    }
    try {
      if (editing === 'new') {
        await createProduct(payload)
      } else {
        await updateProduct(editing, payload)
      }
      setEditing(null)
      await refresh()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (p) => {
    setBusy(true)
    try {
      await setProductActive(p.id, !p.activo)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (p) => {
    const ok = await confirm({
      icon: '🗑️',
      title: `Eliminar "${p.nombre}"`,
      message: 'Se eliminara definitivamente. Si solo quieres sacarlo del menu, usa "Desactivar".',
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    setBusy(true)
    try {
      await deleteProduct(p.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 ' +
    'outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="text-sm text-slate-400 hover:text-white">
              ← Volver al mapa
            </Link>
            <h1 className="text-2xl font-bold text-white">Productos</h1>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
          >
            + Nuevo
          </button>
        </div>

        {error && <p className="font-medium text-red-400">{error}</p>}
        {loading && <p className="text-slate-400">Cargando...</p>}

        {CATEGORIAS.map((cat) => {
          const items = products.filter((p) => p.categoria === cat.value)
          if (items.length === 0 && loading) return null
          return (
            <section key={cat.value}>
              <h2 className="mb-3 text-lg font-bold text-white">{cat.label}</h2>
              {items.length === 0 && !loading && (
                <p className="text-sm text-slate-500">Sin productos en esta categoria.</p>
              )}
              <ul className="space-y-2">
                {items.map((p) => (
                  <li
                    key={p.id}
                    className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ${
                      p.activo ? 'bg-slate-800' : 'bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${p.activo ? 'text-white' : 'text-slate-500 line-through'}`}>
                        {p.nombre}
                        {!p.activo && (
                          <span className="ml-2 text-xs font-normal text-yellow-500 no-underline">
                            (inactivo)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-400">
                        Publico {money(p.precio_publico)} · Costo {money(p.precio_costo)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openEdit(p)}
                        className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleToggleActive(p)}
                        className="rounded-lg bg-yellow-900/50 px-3 py-2 text-sm text-yellow-200 hover:bg-yellow-800/60"
                      >
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(p)}
                        className="rounded-lg bg-red-900/60 px-3 py-2 text-sm text-red-200 hover:bg-red-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {/* Modal crear/editar */}
      {editing !== null && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md space-y-4 rounded-2xl bg-slate-800 p-6"
          >
            <h2 className="text-xl font-bold text-white">
              {editing === 'new' ? 'Nuevo producto' : 'Editar producto'}
            </h2>

            <input
              className={inputClass}
              placeholder="Nombre (ej. Mojito)"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <select
              className={inputClass}
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="block text-sm text-slate-300">
              Precio publico
              <input
                className={`${inputClass} mt-1`}
                placeholder="25000"
                inputMode="decimal"
                type="number"
                min="0"
                step="any"
                value={form.precio_publico}
                onChange={(e) => setForm({ ...form, precio_publico: e.target.value })}
              />
            </label>
            <label className="block text-sm text-slate-300">
              Precio de costo (solo visible para admin)
              <input
                className={`${inputClass} mt-1`}
                placeholder="8000"
                inputMode="decimal"
                type="number"
                min="0"
                step="any"
                value={form.precio_costo}
                onChange={(e) => setForm({ ...form, precio_costo: e.target.value })}
              />
            </label>

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

      {confirmModal}
    </main>
  )
}

export default AdminProducts
