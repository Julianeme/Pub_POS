import { useEffect, useState } from 'react'
import { CATEGORIAS, listActiveProducts } from '../lib/products'
import { money } from '../lib/format'

// Modal para elegir UN producto del catalogo + cantidad (+ motivo/nota).
// Reutilizado por merma/rotura y consumo interno.
// motivos (opcional): lista de chips rapidos; si se elige uno, va como nota.
// onSave(productId, cantidad, nota) — onClose() para cancelar.
function ProductQtyModal({ icon = '📦', title, confirmLabel = 'Registrar', motivos, onSave, onClose, busy }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoria, setCategoria] = useState('coctel')
  const [selected, setSelected] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [nota, setNota] = useState('')
  const [motivo, setMotivo] = useState('') // chip elegido (o 'Otro')

  const esOtro = motivo === 'Otro'
  // Texto final del motivo/nota que se guarda
  const notaFinal = motivos ? (esOtro ? nota.trim() : motivo) : nota.trim()

  useEffect(() => {
    listActiveProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const visible = products.filter((p) => p.categoria === categoria)

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col gap-4 rounded-t-2xl bg-slate-800 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {icon} {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
          >
            Cerrar
          </button>
        </div>

        <div className="flex gap-2">
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

        <div className="min-h-24 flex-1 overflow-y-auto">
          {loading && <p className="text-slate-400">Cargando catalogo...</p>}
          {error && <p className="font-medium text-red-400">{error}</p>}
          {!loading && visible.length === 0 && (
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

        {/* Motivo rapido (chips) o nota libre */}
        {motivos ? (
          <div>
            <div className="flex flex-wrap gap-2">
              {motivos.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    motivo === m ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {m}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMotivo('Otro')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  esOtro ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Otro
              </button>
            </div>
            {esOtro && (
              <input
                autoFocus
                className="mt-2 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Escribe el motivo"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            )}
          </div>
        ) : (
          <input
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nota (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        )}

        <div className="flex items-center gap-3 border-t border-slate-700 pt-4">
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
            disabled={!selected || busy || (motivos && !notaFinal)}
            onClick={() => onSave(selected.id, cantidad, notaFinal)}
            className="h-12 flex-1 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-500 disabled:opacity-40"
          >
            {selected ? `${confirmLabel}: ${cantidad} × ${selected.nombre}` : 'Elige un producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductQtyModal
