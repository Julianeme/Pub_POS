import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEmployee } from '../context/EmployeeContext'
import AmountModal from '../components/AmountModal'
import ProductQtyModal from '../components/ProductQtyModal'
import TipPayoutModal from '../components/TipPayoutModal'
import { money } from '../lib/format'
import { listEmployees } from '../lib/employees'
import { addExpense } from '../lib/expenses'
import { addCashMovement } from '../lib/cash'
import { addProductLoss } from '../lib/losses'
import { getTipsSummary, createTipPayout, listTipPayouts } from '../lib/tips'

// Pantalla de caja: base, retiros, gastos, DJ, mermas, consumo interno y
// liquidacion de propinas. Todo lo que alimenta el cierre de caja (Fase 9).
function Caja() {
  const { employee } = useEmployee()

  const [modal, setModal] = useState(null) // ver ACCIONES
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const [empleados, setEmpleados] = useState([])
  const [tips, setTips] = useState({ recaudado: 0, liquidado: 0, saldo: 0 })
  const [payouts, setPayouts] = useState([])

  const refresh = async () => {
    try {
      const [emps, summary, list] = await Promise.all([
        listEmployees(),
        getTipsSummary(),
        listTipPayouts(),
      ])
      setEmpleados(emps)
      setTips(summary)
      setPayouts(list)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Ejecuta una accion, cierra el modal y refresca
  const run = async (fn, okMsg) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      setModal(null)
      showToast(okMsg)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const acciones = [
    { key: 'base', icon: '🏦', label: 'Base de caja', desc: 'Fondo inicial del turno' },
    { key: 'retiro', icon: '📤', label: 'Retiro', desc: 'Efectivo que sale sin gastarse' },
    { key: 'otro', icon: '🧾', label: 'Otro gasto', desc: 'Dinero gastado en algo' },
    { key: 'dj', icon: '🎧', label: 'DJ residente', desc: 'Cuenta del DJ (efectivo + cortesias)', to: '/dj' },
    { key: 'merma', icon: '💥', label: 'Merma / rotura', desc: 'Producto perdido o roto' },
    { key: 'consumo', icon: '🧑‍🍳', label: 'Consumo interno', desc: 'Consumo del personal' },
  ]

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link to="/" className="text-sm text-slate-400 hover:text-white">
            ← Volver al mapa
          </Link>
          <h1 className="text-2xl font-bold text-white">Caja y gastos</h1>
        </div>

        {error && <p className="font-medium text-red-400">{error}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {acciones.map((a) => {
            const contenido = (
              <>
                <span className="text-3xl">{a.icon}</span>
                <p className="mt-2 font-semibold text-white">{a.label}</p>
                <p className="text-xs text-slate-400">{a.desc}</p>
              </>
            )
            const clase = 'block rounded-2xl bg-slate-800 p-4 text-left hover:bg-slate-700'
            return a.to ? (
              <Link key={a.key} to={a.to} className={clase}>
                {contenido}
              </Link>
            ) : (
              <button
                key={a.key}
                type="button"
                onClick={() => {
                  setError('')
                  setModal(a.key)
                }}
                className={clase}
              >
                {contenido}
              </button>
            )
          })}
        </div>

        {/* Propinas */}
        <section className="rounded-2xl bg-slate-800 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Propinas</h2>
              <p className="text-sm text-slate-400">
                Recaudado {money(tips.recaudado)} · Liquidado {money(tips.liquidado)}
              </p>
              <p className="mt-1 text-2xl font-bold text-green-400">
                Saldo por liquidar: {money(tips.saldo)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('')
                setModal('payout')
              }}
              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-500"
            >
              Liquidar
            </button>
          </div>

          {payouts.length > 0 && (
            <ul className="mt-4 space-y-2">
              {payouts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-slate-900/50 px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-semibold text-white">{p.empleado?.nombre ?? 'Empleado'}</span>
                    <span className="text-slate-400">
                      {(p.desde || p.hasta) && ` · ${p.desde ?? '...'} a ${p.hasta ?? '...'}`}
                      {p.nota && ` · ${p.nota}`}
                    </span>
                  </div>
                  <span className="font-semibold text-white">{money(p.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Modales de accion */}
      {modal === 'base' && (
        <AmountModal
          icon="🏦"
          title="Base de caja"
          montoLabel="Monto del fondo inicial"
          onSave={(monto) =>
            run(
              () => addCashMovement({ tipo: 'base', monto, empleadoId: employee.id }),
              'Base de caja registrada'
            )
          }
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}

      {modal === 'retiro' && (
        <AmountModal
          icon="📤"
          title="Retiro de caja"
          hint="Efectivo que sale de la caja pero no se gasta (ej. llevar a la caja fuerte)."
          montoLabel="Monto a retirar"
          descripcionLabel="Motivo (opcional)"
          descripcionPlaceholder="Ej. llevado a caja fuerte"
          tone="red"
          confirmLabel="Retirar"
          onSave={(monto, descripcion) =>
            run(
              () => addCashMovement({ tipo: 'retiro', monto, descripcion, empleadoId: employee.id }),
              'Retiro registrado'
            )
          }
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}

      {modal === 'otro' && (
        <AmountModal
          icon="🧾"
          title="Otro gasto"
          hint="Dinero gastado en algo (insumos, transporte, etc.). Reduce la utilidad."
          montoLabel="Monto del gasto"
          descripcionLabel="Descripcion"
          descripcionPlaceholder="Ej. limones, transporte..."
          descripcionRequerida
          onSave={(monto, descripcion) =>
            run(
              () => addExpense({ tipo: 'otro', monto, descripcion, empleadoId: employee.id }),
              'Gasto registrado'
            )
          }
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}

      {modal === 'merma' && (
        <ProductQtyModal
          icon="💥"
          title="Merma / rotura"
          confirmLabel="Registrar merma"
          onSave={(productId, cantidad, nota) =>
            run(
              () =>
                addProductLoss({
                  tipo: 'merma',
                  productId,
                  cantidad,
                  descripcion: nota,
                  empleadoId: employee.id,
                }),
              'Merma registrada'
            )
          }
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}

      {modal === 'consumo' && (
        <ProductQtyModal
          icon="🧑‍🍳"
          title="Consumo interno"
          confirmLabel="Registrar consumo"
          onSave={(productId, cantidad, nota) =>
            run(
              () =>
                addProductLoss({
                  tipo: 'consumo_interno',
                  productId,
                  cantidad,
                  descripcion: nota,
                  empleadoId: employee.id,
                }),
              'Consumo interno registrado'
            )
          }
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}

      {modal === 'payout' && (
        <TipPayoutModal
          empleados={empleados}
          saldo={tips.saldo}
          onSave={(data) =>
            run(
              () => createTipPayout({ ...data, createdBy: employee.id }),
              'Propinas liquidadas'
            )
          }
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-green-600 px-6 py-3 font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  )
}

export default Caja
