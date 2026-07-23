import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listCourtesyReasonsAdmin,
  addCourtesyReason,
  deleteCourtesyReason,
} from '../lib/courtesies'
import { useConfirm } from '../components/ConfirmModal'

// Administracion de motivos de cortesia (solo admin). "Otro" no se lista
// aqui: es una opcion fija del sistema con campo abierto.
function AdminCourtesyReasons() {
  const { confirm, confirmModal } = useConfirm()
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nuevo, setNuevo] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      setReasons(await listCourtesyReasonsAdmin())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const nombre = nuevo.trim()
    if (!nombre) return
    setBusy(true)
    setError('')
    try {
      await addCourtesyReason(nombre)
      setNuevo('')
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (r) => {
    const ok = await confirm({
      icon: '🗑️',
      title: 'Eliminar motivo',
      message: `Se eliminara el motivo "${r.nombre}".`,
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await deleteCourtesyReason(r.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link to="/" className="text-sm text-slate-400 hover:text-white">
            ← Volver al mapa
          </Link>
          <h1 className="text-2xl font-bold text-white">Motivos de cortesia</h1>
          <p className="text-sm text-slate-400">
            Estos motivos aparecen al regalar una cortesia. "Otro" siempre esta
            disponible con campo libre y no se puede eliminar.
          </p>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Nuevo motivo (ej. Promocion)"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || !nuevo.trim()}
            className="rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            Agregar
          </button>
        </form>

        {error && <p className="font-medium text-red-400">{error}</p>}
        {loading && <p className="text-slate-400">Cargando...</p>}

        {!loading && reasons.length === 0 && (
          <p className="text-slate-400">No hay motivos. Agrega el primero arriba.</p>
        )}

        <ul className="space-y-2">
          {reasons.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-slate-800 px-5 py-4"
            >
              <span className="font-semibold text-white">{r.nombre}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDelete(r)}
                className="rounded-lg bg-red-900/60 px-4 py-2 text-sm text-red-200 hover:bg-red-800 disabled:opacity-40"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </div>

      {confirmModal}
    </main>
  )
}

export default AdminCourtesyReasons
