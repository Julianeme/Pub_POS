import { useState } from 'react'
import { money } from '../lib/format'

// Modal generico "monto (+ descripcion opcional)". Reutilizado por base de
// caja, retiro, otro gasto y DJ residente.
// onSave(monto, descripcion) — onClose() para cancelar.
function AmountModal({
  icon = '💵',
  title,
  montoLabel = 'Monto',
  descripcionLabel,
  descripcionPlaceholder,
  descripcionRequerida = false,
  confirmLabel = 'Registrar',
  tone = 'green',
  onSave,
  onClose,
  busy,
}) {
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')

  const nMonto = Number(monto)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!monto || Number.isNaN(nMonto) || nMonto <= 0) {
      setError('Monto invalido')
      return
    }
    if (descripcionRequerida && !descripcion.trim()) {
      setError('La descripcion es obligatoria')
      return
    }
    setError('')
    onSave(nMonto, descripcion.trim())
  }

  const inputClass =
    'mt-1 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 ' +
    'outline-none focus:ring-2 focus:ring-blue-500'
  const btn = tone === 'red' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-6">
        <h2 className="text-xl font-bold text-white">
          {icon} {title}
        </h2>

        <label className="block text-sm text-slate-300">
          {montoLabel}
          <input
            autoFocus
            className={inputClass}
            inputMode="decimal"
            type="number"
            min="0"
            step="any"
            placeholder="Ej. 50000"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </label>

        {descripcionLabel && (
          <label className="block text-sm text-slate-300">
            {descripcionLabel}
            <input
              className={inputClass}
              placeholder={descripcionPlaceholder}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
        )}

        {monto && !Number.isNaN(nMonto) && (
          <p className="text-right text-lg font-bold text-white">{money(nMonto)}</p>
        )}

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
            className={`flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-50 ${btn}`}
          >
            {busy ? 'Guardando...' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AmountModal
