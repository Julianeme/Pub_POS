import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEmployee } from '../context/EmployeeContext'
import { useConfirm } from '../components/ConfirmModal'
import { money } from '../lib/format'
import { getOpenClosing, openClosing, computeSummary, closeClosing } from '../lib/closings'

// Fila etiqueta/valor
function Row({ label, value, strong, tone }) {
  const color = tone === 'red' ? 'text-red-400' : tone === 'green' ? 'text-green-400' : 'text-white'
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${strong ? 'font-semibold text-white' : 'text-slate-400'}`}>
        {label}
      </span>
      <span className={`${strong ? 'text-lg font-bold' : 'font-semibold'} ${color}`}>{value}</span>
    </div>
  )
}

function CashClosing() {
  const { employee } = useEmployee()
  const { confirm, confirmModal } = useConfirm()

  const [jornada, setJornada] = useState(null)
  const [summary, setSummary] = useState(null)
  const [contado, setContado] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cargar = async () => {
    setError('')
    try {
      const j = await getOpenClosing()
      setJornada(j)
      setSummary(j ? await computeSummary(j.opened_at, new Date().toISOString()) : null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const handleOpen = async () => {
    setBusy(true)
    setError('')
    try {
      await openClosing(employee.id)
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleClose = async () => {
    const ok = await confirm({
      icon: '🧮',
      title: 'Cerrar la jornada',
      message: 'Se guardara el corte con los totales actuales. Verifica el efectivo contado.',
      confirmLabel: 'Cerrar caja',
    })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await closeClosing({
        id: jornada.id,
        openedAt: jornada.opened_at,
        efectivoContado: contado,
        notas,
        empleadoId: employee.id,
      })
      setContado('')
      setNotas('')
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const diferencia = summary && contado !== '' ? Number(contado) - summary.efectivoEsperado : null

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="text-sm text-slate-400 hover:text-white">
              ← Volver al mapa
            </Link>
            <h1 className="text-2xl font-bold text-white">Cierre de caja</h1>
          </div>
          <Link
            to="/reportes"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          >
            Reportes
          </Link>
        </div>

        {error && <p className="font-medium text-red-400">{error}</p>}
        {loading && <p className="text-slate-400">Cargando...</p>}

        {/* Sin jornada abierta */}
        {!loading && !jornada && (
          <div className="space-y-4 rounded-2xl bg-slate-800 p-6">
            <p className="text-slate-300">
              No hay una jornada abierta. Abre la jornada al iniciar el turno del bar.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleOpen}
              className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
            >
              Abrir jornada
            </button>
          </div>
        )}

        {/* Jornada abierta: resumen en vivo */}
        {!loading && jornada && summary && (
          <>
            <div className="flex items-center justify-between rounded-xl bg-slate-800 px-5 py-3">
              <p className="text-sm text-slate-400">
                Jornada abierta desde{' '}
                <span className="text-white">
                  {new Date(jornada.opened_at).toLocaleString('es-CO')}
                </span>
              </p>
              <button
                type="button"
                onClick={cargar}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
              >
                Actualizar
              </button>
            </div>

            {/* Ventas */}
            <section className="rounded-2xl bg-slate-800 p-5">
              <h2 className="mb-2 font-bold text-white">Ventas</h2>
              <Row label="Efectivo" value={money(summary.ventas.efectivo)} />
              <Row label="Tarjeta" value={money(summary.ventas.tarjeta)} />
              <Row label="Transferencia" value={money(summary.ventas.transferencia)} />
              <div className="my-1 border-t border-slate-700" />
              <Row label="Total ventas" value={money(summary.ventas.total)} strong />
            </section>

            {/* Salidas y control */}
            <section className="rounded-2xl bg-slate-800 p-5">
              <h2 className="mb-2 font-bold text-white">Gastos y salidas</h2>
              <Row label="Gastos (hielo)" value={money(summary.gastos.hielo)} />
              <Row label="Gastos (otros)" value={money(summary.gastos.otro)} />
              <Row label="Pagos DJ" value={money(summary.gastos.dj)} />
              <Row label="Total gastos" value={money(summary.gastos.total)} strong tone="red" />
              <div className="my-1 border-t border-slate-700" />
              <Row label="Retiros de caja" value={money(summary.retiros)} tone="red" />
              <Row label="Base de caja" value={money(summary.base)} />
            </section>

            {/* Propinas */}
            <section className="rounded-2xl bg-slate-800 p-5">
              <h2 className="mb-2 font-bold text-white">Propinas</h2>
              <Row label="Recaudadas" value={money(summary.propinas.recaudadas)} />
              <Row label="  de las cuales en efectivo" value={money(summary.propinas.efectivo)} />
              <Row label="Liquidadas a empleados" value={money(summary.propinas.liquidadas)} tone="red" />
            </section>

            {/* Cortesias / mermas / consumo (control, a costo) */}
            <section className="rounded-2xl bg-slate-800 p-5">
              <h2 className="mb-2 font-bold text-white">Cortesias y perdidas (control)</h2>
              <Row
                label="Cortesias"
                value={`${money(summary.cortesias.venta)} venta · ${money(summary.cortesias.costo)} costo`}
              />
              <Row label="Mermas / roturas (costo)" value={money(summary.mermasCosto)} />
              <Row label="Consumo interno (costo)" value={money(summary.consumoCosto)} />
            </section>

            {/* Cuadre de efectivo */}
            <section className="rounded-2xl bg-slate-800 p-5">
              <h2 className="mb-2 font-bold text-white">Cuadre de efectivo</h2>
              <Row label="Efectivo esperado en caja" value={money(summary.efectivoEsperado)} strong />
              <label className="mt-2 block text-sm text-slate-300">
                Efectivo contado (opcional)
                <input
                  className="mt-1 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Lo que hay fisicamente en la caja"
                  value={contado}
                  onChange={(e) => setContado(e.target.value)}
                />
              </label>
              {diferencia != null && (
                <Row
                  label="Diferencia (contado - esperado)"
                  value={money(diferencia)}
                  strong
                  tone={diferencia < 0 ? 'red' : 'green'}
                />
              )}
            </section>

            {/* Neto */}
            <section className="rounded-2xl bg-slate-800 p-5">
              <Row label="Neto de caja (ventas - gastos)" value={money(summary.neto)} strong tone="green" />
            </section>

            <textarea
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Notas del cierre (opcional)"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />

            <button
              type="button"
              disabled={busy}
              onClick={handleClose}
              className="w-full rounded-2xl bg-red-600 py-4 text-lg font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              Cerrar jornada y guardar corte
            </button>
          </>
        )}
      </div>

      {confirmModal}
    </main>
  )
}

export default CashClosing
