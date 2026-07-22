import { useEffect, useState } from 'react'
import { CATEGORIAS, listActiveProducts } from '../lib/products'
import { listCourtesyReasons } from '../lib/courtesies'
import { money } from '../lib/format'

// Formulario "Regalar cortesia": elegir producto, cantidad y motivo.
// No muestra el precio de costo (se registra del lado del servidor).
// onSave(productId, cantidad, motivo, motivoDetalle) — onClose() cancela.
// subtitulo: texto opcional para indicar el destino (ej. "Mesa 3 · Juan").
function CourtesyModal({ onSave, onClose, busy, subtitulo }) {
  const [products, setProducts] = useState([])
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoria, setCategoria] = useState('coctel')
  const [selected, setSelected] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [motivo, setMotivo] = useState('') // nombre del motivo, o 'Otro'
  const [detalle, setDetalle] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    Promise.all([listActiveProducts(), listCourtesyReasons()])
      .then(([prods, reas]) => {
        setProducts(prods)
        setReasons(reas)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const visible = products.filter((p) => p.categoria === categoria)
  const esOtro = motivo === 'Otro'

  const handleSave = () => {
    if (!selected) return
    if (!motivo) {
      setFormError('Elige un motivo')
      return
    }
    if (esOtro && !detalle.trim()) {
      setFormError('Escribe el motivo')
      return
    }
    setFormError('')
    onSave(selected.id, cantidad, motivo, esOtro ? detalle.trim() : null)
  }

  const chip = (activo) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      activo ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
    }`

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col gap-4 rounded-t-2xl bg-slate-800 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">🎁 Regalar cortesia</h2>
            {subtitulo && <p className="text-sm text-slate-400">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
          >
            Cerrar
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {loading && <p className="text-slate-400">Cargando...</p>}
          {error && <p className="font-medium text-red-400">{error}</p>}

          {!loading && (
            <>
              {/* Producto */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-300">1. Producto</p>
                <div className="mb-2 flex gap-2">
                  {CATEGORIAS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategoria(c.value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        categoria === c.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                {visible.length === 0 && (
                  <p className="text-sm text-slate-500">Sin productos en esta categoria.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {visible.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p)}
                      className={`rounded-xl p-3 text-left transition-colors ${
                        selected?.id === p.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      <span className="block font-semibold">{p.nombre}</span>
                      <span className="text-sm opacity-80">{money(p.precio_publico)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-300">2. Motivo</p>
                <div className="flex flex-wrap gap-2">
                  {reasons.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setMotivo(r.nombre)}
                      className={chip(motivo === r.nombre)}
                    >
                      {r.nombre}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMotivo('Otro')}
                    className={chip(esOtro)}
                  >
                    Otro
                  </button>
                </div>
                {esOtro && (
                  <input
                    autoFocus
                    className="mt-2 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Escribe el motivo"
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Cantidad + guardar */}
        <div className="space-y-3 border-t border-slate-700 pt-4">
          {formError && <p className="font-medium text-red-400">{formError}</p>}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                disabled={!selected}
                className="h-12 w-12 rounded-xl bg-slate-700 text-2xl font-bold text-white hover:bg-slate-600 disabled:opacity-40"
              >
                −
              </button>
              <span className="w-10 text-center text-2xl font-bold text-white">{cantidad}</span>
              <button
                type="button"
                onClick={() => setCantidad((c) => c + 1)}
                disabled={!selected}
                className="h-12 w-12 rounded-xl bg-slate-700 text-2xl font-bold text-white hover:bg-slate-600 disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={!selected || busy}
              onClick={handleSave}
              className="h-12 flex-1 rounded-xl bg-purple-600 font-semibold text-white hover:bg-purple-500 disabled:opacity-40"
            >
              {selected ? `Regalar ${cantidad} × ${selected.nombre}` : 'Elige un producto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourtesyModal
