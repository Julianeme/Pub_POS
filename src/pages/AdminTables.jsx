import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBarLayout } from '../hooks/useBarLayout'
import { addTable, deleteTable, addBarSeat, deleteBarSeat } from '../lib/layout'
import { useConfirm } from '../components/ConfirmModal'
import BackButton from '../components/BackButton'

// Configuracion (solo admin): agregar o eliminar mesas por piso y puestos de barra.
function AdminTables() {
  const { floors, barSeats, loading, error, refresh } = useBarLayout()
  const { confirm, confirmModal } = useConfirm()
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const run = async (action) => {
    setBusy(true)
    setActionError('')
    try {
      await action()
      await refresh()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Siguiente numero de mesa dentro de un piso (a partir del mayor "orden")
  const handleAddTable = (floor) => {
    const next = Math.max(0, ...floor.tables.map((t) => t.orden)) + 1
    run(() => addTable(floor.id, `Mesa ${next}`, next))
  }

  const handleDeleteTable = async (mesa) => {
    if (mesa.estado === 'ocupada') {
      setActionError(`${mesa.nombre} esta ocupada: liberala antes de eliminarla`)
      return
    }
    const ok = await confirm({
      icon: '🗑️',
      title: 'Eliminar mesa',
      message: `Se eliminara ${mesa.nombre}.`,
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    run(() => deleteTable(mesa.id))
  }

  const handleAddBarSeat = () => {
    const next = Math.max(0, ...barSeats.map((s) => s.orden)) + 1
    run(() => addBarSeat(`Puesto ${next}`, next))
  }

  const handleDeleteBarSeat = async (puesto) => {
    if (puesto.estado === 'ocupado') {
      setActionError(`${puesto.nombre} esta ocupado: liberalo antes de eliminarlo`)
      return
    }
    const ok = await confirm({
      icon: '🗑️',
      title: 'Eliminar puesto',
      message: `Se eliminara ${puesto.nombre}.`,
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    run(() => deleteBarSeat(puesto.id))
  }

  const chipClass = (estado) =>
    `flex items-center gap-2 rounded-xl px-4 py-3 ` +
    (estado === 'libre' ? 'bg-slate-800' : 'bg-red-900/40')

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <div className="mb-3">
            <BackButton to="/" />
          </div>
          <h1 className="text-2xl font-bold text-white">Mesas y barra</h1>
          <p className="text-sm text-slate-400">
            Agrega o elimina mesas y puestos. Solo se pueden eliminar si están libres.
          </p>
        </div>

        {error && <p className="font-medium text-red-400">{error}</p>}
        {actionError && <p className="font-medium text-red-400">{actionError}</p>}
        {loading && <p className="text-slate-400">Cargando...</p>}

        {floors.map((floor) => (
          <section key={floor.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{floor.nombre}</h2>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAddTable(floor)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                + Agregar mesa
              </button>
            </div>
            <ul className="space-y-2">
              {floor.tables.map((mesa) => (
                <li key={mesa.id} className={chipClass(mesa.estado)}>
                  <span className="flex-1 font-semibold text-white">{mesa.nombre}</span>
                  <span className="text-sm text-slate-400">
                    {mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}
                  </span>
                  <button
                    type="button"
                    disabled={busy || mesa.estado === 'ocupada'}
                    onClick={() => handleDeleteTable(mesa)}
                    className="rounded-lg bg-red-900/60 px-3 py-2 text-sm text-red-200 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Barra</h2>
            <button
              type="button"
              disabled={busy}
              onClick={handleAddBarSeat}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              + Agregar puesto
            </button>
          </div>
          <ul className="space-y-2">
            {barSeats.map((puesto) => (
              <li key={puesto.id} className={chipClass(puesto.estado)}>
                <span className="flex-1 font-semibold text-white">{puesto.nombre}</span>
                <span className="text-sm text-slate-400">
                  {puesto.estado === 'libre' ? 'Libre' : puesto.nombre_cliente}
                </span>
                <button
                  type="button"
                  disabled={busy || puesto.estado === 'ocupado'}
                  onClick={() => handleDeleteBarSeat(puesto)}
                  className="rounded-lg bg-red-900/60 px-3 py-2 text-sm text-red-200 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {confirmModal}
    </main>
  )
}

export default AdminTables
