import { useState } from 'react'
import { money } from '../lib/format'
import { METODOS } from '../lib/payments'

const BILLETES = [10000, 20000, 50000, 100000, 200000]

// Modal de cobro: monto de la cuenta, propina opcional y metodo de pago.
// Para efectivo, muestra una mini-registradora (con cuanto paga -> cambio).
// onPay(metodo, propina) — onClose() para cancelar.
function PaymentModal({ titulo, monto, onPay, onClose, busy, error }) {
  const [propinaMode, setPropinaMode] = useState('no') // 'no' | '10' | 'otro'
  const [otroValor, setOtroValor] = useState('')
  const [efectivo, setEfectivo] = useState(false) // pantalla de cambio
  const [pagaCon, setPagaCon] = useState('')

  const propina =
    propinaMode === '10'
      ? Math.round(monto * 0.1)
      : propinaMode === 'otro'
        ? Number(otroValor) || 0
        : 0
  const total = monto + propina

  const nPaga = Number(pagaCon)
  const cambio = pagaCon !== '' && !Number.isNaN(nPaga) ? nPaga - total : null

  // Sugerencias de pago: exacto + billetes comunes >= total
  const sugerencias = [total, ...BILLETES.filter((b) => b >= total)].filter(
    (v, i, a) => a.indexOf(v) === i
  )

  const chip = (activo) =>
    `flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
      activo ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
    }`

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl bg-slate-800 p-6">
        <div>
          <h2 className="text-xl font-bold text-white">{titulo}</h2>
          <p className="mt-1 text-3xl font-bold text-green-400">{money(total)}</p>
          {propina > 0 && (
            <p className="text-sm text-slate-400">
              Cuenta {money(monto)} + propina {money(propina)}
            </p>
          )}
        </div>

        {!efectivo ? (
          <>
            {/* Propina */}
            <div>
              <p className="mb-2 text-sm text-slate-300">Propina</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPropinaMode('no')} className={chip(propinaMode === 'no')}>
                  Sin propina
                </button>
                <button type="button" onClick={() => setPropinaMode('10')} className={chip(propinaMode === '10')}>
                  10% ({money(Math.round(monto * 0.1))})
                </button>
                <button type="button" onClick={() => setPropinaMode('otro')} className={chip(propinaMode === 'otro')}>
                  Otro
                </button>
              </div>
              {propinaMode === 'otro' && (
                <input
                  autoFocus
                  className="mt-2 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Valor de la propina"
                  value={otroValor}
                  onChange={(e) => setOtroValor(e.target.value)}
                />
              )}
            </div>

            {/* Metodo de pago */}
            <div>
              <p className="mb-2 text-sm text-slate-300">Metodo de pago</p>
              <div className="grid gap-2">
                {METODOS.map((m) =>
                  m.value === 'efectivo' ? (
                    <button
                      key={m.value}
                      type="button"
                      disabled={busy}
                      onClick={() => setEfectivo(true)}
                      className="rounded-xl bg-green-600 py-4 text-lg font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                    >
                      {m.label}
                    </button>
                  ) : (
                    <button
                      key={m.value}
                      type="button"
                      disabled={busy}
                      onClick={() => onPay(m.value, propina)}
                      className="rounded-xl bg-green-600 py-4 text-lg font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                    >
                      {m.label}
                    </button>
                  )
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Registradora de efectivo */}
            <div>
              <p className="mb-2 text-sm text-slate-300">¿Con cuanto paga?</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {sugerencias.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPagaCon(String(s))}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                  >
                    {s === total ? 'Exacto' : money(s)}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                className="w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                inputMode="decimal"
                type="number"
                min="0"
                step="any"
                placeholder="Otro monto"
                value={pagaCon}
                onChange={(e) => setPagaCon(e.target.value)}
              />
            </div>

            <div className="rounded-xl bg-slate-900/60 p-4 text-center">
              <p className="text-sm text-slate-400">Cambio a devolver</p>
              <p className={`text-3xl font-bold ${cambio != null && cambio < 0 ? 'text-red-400' : 'text-white'}`}>
                {cambio == null ? '—' : cambio < 0 ? `Faltan ${money(-cambio)}` : money(cambio)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEfectivo(false)}
                disabled={busy}
                className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
              >
                Atras
              </button>
              <button
                type="button"
                disabled={busy || (cambio != null && cambio < 0)}
                onClick={() => onPay('efectivo', propina)}
                className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                Cobrar
              </button>
            </div>
          </>
        )}

        {error && <p className="font-medium text-red-400">{error}</p>}

        {!efectivo && (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}

export default PaymentModal
