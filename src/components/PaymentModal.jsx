import { money } from '../lib/format'
import { METODOS } from '../lib/payments'

// Modal de cobro: muestra el monto y deja elegir el metodo de pago.
// onPay(metodo) — onClose() para cancelar. busy deshabilita durante el cobro.
function PaymentModal({ titulo, monto, onPay, onClose, busy, error }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl bg-slate-800 p-6">
        <div>
          <h2 className="text-xl font-bold text-white">{titulo}</h2>
          <p className="mt-1 text-3xl font-bold text-green-400">{money(monto)}</p>
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-300">Metodo de pago</p>
          <div className="grid gap-2">
            {METODOS.map((m) => (
              <button
                key={m.value}
                type="button"
                disabled={busy}
                onClick={() => onPay(m.value)}
                className="rounded-xl bg-green-600 py-4 text-lg font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="font-medium text-red-400">{error}</p>}

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="w-full rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default PaymentModal
