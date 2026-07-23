import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEmployee } from '../context/EmployeeContext'
import AmountModal from '../components/AmountModal'
import ProductPicker from '../components/ProductPicker'
import { useConfirm } from '../components/ConfirmModal'
import { money } from '../lib/format'
import {
  getOpenDjSession,
  openDjSession,
  closeDjSession,
  fetchDjAccount,
  addDjPayment,
  addDjCourtesies,
} from '../lib/dj'

// Cuenta del DJ residente: se abre para la noche, acumula pagos en efectivo y
// cortesias (bebidas), y se cierra cuando se le pago / termino (sin cobro).
function DjAccount() {
  const { employee } = useEmployee()
  const { confirm, confirmModal } = useConfirm()

  const [session, setSession] = useState(null)
  const [account, setAccount] = useState(null)
  const [nombreDj, setNombreDj] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // null | 'pago' | 'cortesia'

  const refresh = async () => {
    setError('')
    try {
      const s = await getOpenDjSession()
      setSession(s)
      setAccount(s ? await fetchDjAccount(s.id) : null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      setModal(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleOpen = () =>
    run(async () => {
      await openDjSession({ nombreDj: nombreDj.trim(), empleadoId: employee.id })
      setNombreDj('')
    })

  const handleClose = async () => {
    const ok = await confirm({
      icon: '🎧',
      title: 'Cerrar cuenta del DJ',
      message: 'Se cerrara la cuenta de esta noche. No requiere cobro.',
      confirmLabel: 'Cerrar cuenta',
      tone: 'default',
    })
    if (!ok) return
    run(() => closeDjSession({ id: session.id, empleadoId: employee.id }))
  }

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link to="/caja" className="text-sm text-slate-400 hover:text-white">
            ← Volver a caja
          </Link>
          <h1 className="text-2xl font-bold text-white">🎧 DJ residente</h1>
        </div>

        {error && <p className="font-medium text-red-400">{error}</p>}
        {loading && <p className="text-slate-400">Cargando...</p>}

        {/* Sin cuenta abierta */}
        {!loading && !session && (
          <div className="space-y-4 rounded-2xl bg-slate-800 p-6">
            <p className="text-slate-300">No hay una cuenta de DJ abierta.</p>
            <input
              className="w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del DJ (opcional)"
              value={nombreDj}
              onChange={(e) => setNombreDj(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={handleOpen}
              className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
            >
              Abrir cuenta del DJ
            </button>
          </div>
        )}

        {/* Cuenta abierta */}
        {!loading && session && account && (
          <>
            <div className="rounded-2xl bg-slate-800 p-5">
              <p className="text-lg font-bold text-white">{session.nombre_dj || 'DJ residente'}</p>
              <p className="text-sm text-slate-400">
                Abierta desde {new Date(session.opened_at).toLocaleString('es-CO')}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-900/50 p-3">
                  <p className="text-xs text-slate-400">Pagado en efectivo</p>
                  <p className="text-xl font-bold text-white">{money(account.totalEfectivo)}</p>
                </div>
                <div className="rounded-xl bg-slate-900/50 p-3">
                  <p className="text-xs text-slate-400">Cortesias (valor venta)</p>
                  <p className="text-xl font-bold text-white">{money(account.totalCortesiaVenta)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError('')
                  setModal('pago')
                }}
                className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                💵 Pagar efectivo
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError('')
                  setModal('cortesia')
                }}
                className="flex-1 rounded-xl bg-purple-700 py-3 font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
              >
                🎁 Dar cortesia
              </button>
            </div>

            {/* Pagos en efectivo */}
            <section className="rounded-2xl bg-slate-800 p-5">
              <h2 className="mb-2 font-bold text-white">Pagos en efectivo</h2>
              {account.pagos.length === 0 ? (
                <p className="text-sm text-slate-500">Sin pagos todavia.</p>
              ) : (
                <ul className="space-y-2">
                  {account.pagos.map((p) => (
                    <li key={p.id} className="flex justify-between text-sm">
                      <span className="text-slate-300">
                        {new Date(p.created_at).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-semibold text-white">{money(p.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Cortesias */}
            <section className="rounded-2xl bg-slate-800 p-5">
              <h2 className="mb-2 font-bold text-white">Cortesias (bebidas)</h2>
              {account.cortesias.length === 0 ? (
                <p className="text-sm text-slate-500">Sin cortesias todavia.</p>
              ) : (
                <ul className="space-y-2">
                  {account.cortesias.map((c) => (
                    <li key={c.id} className="flex justify-between text-sm">
                      <span className="text-slate-300">
                        {c.cantidad} × {c.nombre_producto}
                      </span>
                      <span className="text-slate-400">
                        {money(c.cantidad * c.precio_publico)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <button
              type="button"
              disabled={busy}
              onClick={handleClose}
              className="w-full rounded-2xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
            >
              Cerrar cuenta del DJ
            </button>
          </>
        )}
      </div>

      {modal === 'pago' && (
        <AmountModal
          icon="💵"
          title="Pagar al DJ (efectivo)"
          montoLabel="Monto a pagar"
          confirmLabel="Registrar pago"
          onSave={(monto) =>
            run(() => addDjPayment({ sessionId: session.id, monto, empleadoId: employee.id }))
          }
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}

      {modal === 'cortesia' && (
        <ProductPicker
          title="Cortesia para el DJ"
          busy={busy}
          onAdd={(items) =>
            run(() => addDjCourtesies({ sessionId: session.id, items, empleadoId: employee.id }))
          }
          onClose={() => setModal(null)}
        />
      )}

      {confirmModal}
    </main>
  )
}

export default DjAccount
