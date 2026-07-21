import { useState } from 'react'
import { money } from '../lib/format'

// Formulario "Comprar hielo": cantidad + costo unitario, calcula el total.
// onSave(cantidad, costoUnitario) — onClose() para cancelar.
function ExpenseModal({ onSave, onClose, busy }) {
  const [cantidad, setCantidad] = useState('')
  const [costo, setCosto] = useState('')
  const [error, setError] = useState('')

  const nCantidad = Number(cantidad)
  const nCosto = Number(costo)
  const total = (nCantidad || 0) * (nCosto || 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!cantidad || Number.isNaN(nCantidad) || nCantidad <= 0) {
      setError('Cantidad invalida')
      return
    }
    if (costo === '' || Number.isNaN(nCosto) || nCosto < 0) {
      setError('Costo unitario invalido')
      return
    }
    setError('')
    onSave(nCantidad, nCosto)
  }

  const inputClass =
    'mt-1 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 ' +
    'outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-6">
        <h2 className="text-xl font-bold text-white">🧊 Comprar hielo</h2>

        <label className="block text-sm text-slate-300">
          Cantidad (bolsas / unidades)
          <input
            autoFocus
            className={inputClass}
            inputMode="decimal"
            type="number"
            min="0"
            step="any"
            placeholder="Ej. 5"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>

        <label className="block text-sm text-slate-300">
          Costo por unidad
          <input
            className={inputClass}
            inputMode="decimal"
            type="number"
            min="0"
            step="any"
            placeholder="Ej. 3000"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-4 py-3">
          <span className="text-slate-300">Total</span>
          <span className="text-xl font-bold text-white">{money(total)}</span>
        </div>

        {error && <p className="font-medium text-red-400">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
          >
            {busy ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ExpenseModal
