import { useEffect, useState } from 'react'
import { money } from '../lib/format'
import { getTipsInRange } from '../lib/tips'

// Liquidar propinas a un empleado por un periodo. El monto lo decide quien
// liquida (su parte del pozo). Muestra cuanto se recaudo en el rango como guia.
// onSave({ empleadoId, monto, desde, hasta, nota }) — onClose() para cancelar.
function TipPayoutModal({ empleados, saldo, onSave, onClose, busy }) {
  const [empleadoId, setEmpleadoId] = useState('')
  const [monto, setMonto] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [nota, setNota] = useState('')
  const [enRango, setEnRango] = useState(null)
  const [error, setError] = useState('')

  // Muestra cuanto se recaudo en el periodo elegido (ayuda para decidir)
  useEffect(() => {
    if (!desde && !hasta) {
      setEnRango(null)
      return
    }
    let cancel = false
    getTipsInRange(desde, hasta)
      .then((v) => !cancel && setEnRango(v))
      .catch(() => !cancel && setEnRango(null))
    return () => {
      cancel = true
    }
  }, [desde, hasta])

  const handleSubmit = (e) => {
    e.preventDefault()
    const n = Number(monto)
    if (!empleadoId) return setError('Elige el empleado')
    if (!monto || Number.isNaN(n) || n <= 0) return setError('Monto invalido')
    setError('')
    onSave({ empleadoId, monto: n, desde, hasta, nota: nota.trim() })
  }

  const inputClass =
    'mt-1 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 ' +
    'outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-6">
        <div>
          <h2 className="text-xl font-bold text-white">💵 Liquidar propinas</h2>
          <p className="text-sm text-slate-400">Saldo del pozo: {money(saldo)}</p>
        </div>

        <label className="block text-sm text-slate-300">
          Empleado
          <select
            className={inputClass}
            value={empleadoId}
            onChange={(e) => setEmpleadoId(e.target.value)}
          >
            <option value="">Elegir...</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3">
          <label className="flex-1 text-sm text-slate-300">
            Desde (opcional)
            <input type="date" className={inputClass} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="flex-1 text-sm text-slate-300">
            Hasta (opcional)
            <input type="date" className={inputClass} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>

        {enRango != null && (
          <p className="text-sm text-slate-400">Recaudado en ese periodo: {money(enRango)}</p>
        )}

        <label className="block text-sm text-slate-300">
          Monto a pagar
          <input
            className={inputClass}
            inputMode="decimal"
            type="number"
            min="0"
            step="any"
            placeholder="Su parte"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </label>

        <input
          className={inputClass.replace('mt-1 ', '')}
          placeholder="Nota (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />

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
            {busy ? 'Guardando...' : 'Liquidar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TipPayoutModal
