import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DIAS,
  diasTexto,
  horaCorta,
  listPromotionsAdmin,
  createPromotion,
  updatePromotion,
  setPromotionActive,
  deletePromotion,
} from '../lib/promotions'
import { CATEGORIAS, listActiveProducts } from '../lib/products'
import { money } from '../lib/format'

const EMPTY_FORM = {
  nombre: '',
  tipo: '2x1',
  dias: [],
  horaInicio: '18:00',
  horaFin: '21:00',
  productIds: [],
}

function AdminPromotions() {
  const [promos, setPromos] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [pr, prods] = await Promise.all([listPromotionsAdmin(), listActiveProducts()])
      setPromos(pr)
      setProducts(prods)
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
      tipo: p.tipo,
      dias: p.dias_semana,
      horaInicio: horaCorta(p.hora_inicio),
      horaFin: horaCorta(p.hora_fin),
      productIds: p.product_ids,
    })
    setFormError('')
    setEditing(p.id)
  }

  const toggleDia = (value) =>
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(value) ? f.dias.filter((d) => d !== value) : [...f.dias, value],
    }))

  const toggleProduct = (id) =>
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((p) => p !== id)
        : [...f.productIds, id],
    }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return setFormError('Ponle un nombre a la promocion')
    if (form.dias.length === 0) return setFormError('Elige al menos un dia')
    if (form.productIds.length === 0) return setFormError('Elige al menos un producto')
    setSaving(true)
    setFormError('')
    const payload = { ...form, nombre: form.nombre.trim() }
    try {
      if (editing === 'new') await createPromotion(payload)
      else await updatePromotion(editing, payload)
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
      await setPromotionActive(p.id, !p.activo)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar la promocion "${p.nombre}"?`)) return
    setBusy(true)
    try {
      await deletePromotion(p.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const productName = (id) => products.find((p) => p.id === id)?.nombre

  const inputClass =
    'w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 ' +
    'outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="text-sm text-slate-400 hover:text-white">
              ← Volver al mapa
            </Link>
            <h1 className="text-2xl font-bold text-white">Promociones (2x1)</h1>
            <p className="text-sm text-slate-400">
              Se aplican solas al agregar un producto en el dia y horario configurados.
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
          >
            + Nueva
          </button>
        </div>

        {error && <p className="font-medium text-red-400">{error}</p>}
        {loading && <p className="text-slate-400">Cargando...</p>}

        {!loading && promos.length === 0 && (
          <p className="text-slate-400">No hay promociones. Crea la primera.</p>
        )}

        <ul className="space-y-3">
          {promos.map((p) => (
            <li
              key={p.id}
              className={`rounded-xl p-4 ${p.activo ? 'bg-slate-800' : 'bg-slate-800/50'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {p.nombre}
                    <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-slate-900">
                      {p.tipo}
                    </span>
                    {!p.activo && (
                      <span className="ml-2 text-xs text-yellow-500">(inactiva)</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-400">
                    {diasTexto(p.dias_semana)} · {horaCorta(p.hora_inicio)}–{horaCorta(p.hora_fin)}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {p.product_ids.map(productName).filter(Boolean).join(', ') || 'Sin productos'}
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
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal crear/editar */}
      {editing !== null && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <form
            onSubmit={handleSave}
            className="flex max-h-[92vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl bg-slate-800 p-6 sm:rounded-2xl"
          >
            <h2 className="text-xl font-bold text-white">
              {editing === 'new' ? 'Nueva promocion' : 'Editar promocion'}
            </h2>

            <input
              className={inputClass}
              placeholder="Nombre (ej. Happy hour cocteles)"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">Dias</p>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDia(d.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      form.dias.includes(d.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <label className="flex-1 text-sm text-slate-300">
                Desde
                <input
                  type="time"
                  className={`${inputClass} mt-1`}
                  value={form.horaInicio}
                  onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                />
              </label>
              <label className="flex-1 text-sm text-slate-300">
                Hasta
                <input
                  type="time"
                  className={`${inputClass} mt-1`}
                  value={form.horaFin}
                  onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">Productos incluidos</p>
              <div className="space-y-3">
                {CATEGORIAS.map((cat) => {
                  const items = products.filter((p) => p.categoria === cat.value)
                  if (items.length === 0) return null
                  return (
                    <div key={cat.value}>
                      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                        {cat.label}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {items.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProduct(p.id)}
                            className={`rounded-lg p-2.5 text-left text-sm transition-colors ${
                              form.productIds.includes(p.id)
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                            }`}
                          >
                            <span className="block font-semibold">{p.nombre}</span>
                            <span className="text-xs opacity-80">{money(p.precio_publico)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {formError && <p className="font-medium text-red-400">{formError}</p>}

            <div className="flex gap-3 border-t border-slate-700 pt-4">
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

export default AdminPromotions
