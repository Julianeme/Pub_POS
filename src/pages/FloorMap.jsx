import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useBarLayout } from '../hooks/useBarLayout'
import { openTable, occupyBarSeat } from '../lib/layout'

// Pantalla principal: mapa de pisos con mesas y barra con puestos.
// Verde = libre, rojo = ocupada/o. Tocar algo ocupado abre su pedido.
function FloorMap() {
  const { floors, barSeats, loading, error, refresh } = useBarLayout()
  const navigate = useNavigate()

  // selected: null | { type: 'mesa', item } | { type: 'puesto', item } (solo libres)
  const [selected, setSelected] = useState(null)
  const [clientName, setClientName] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const handleMesa = (mesa) => {
    if (mesa.estado === 'ocupada') {
      navigate(`/pedido/mesa/${mesa.id}`)
      return
    }
    setActionError('')
    setSelected({ type: 'mesa', item: mesa })
  }

  const handlePuesto = (puesto) => {
    if (puesto.estado === 'ocupado') {
      navigate(`/pedido/barra/${puesto.id}`)
      return
    }
    setActionError('')
    setClientName('')
    setSelected({ type: 'puesto', item: puesto })
  }

  const close = () => setSelected(null)

  const handleOpenMesa = async () => {
    setBusy(true)
    setActionError('')
    try {
      await openTable(selected.item.id)
      navigate(`/pedido/mesa/${selected.item.id}`)
    } catch (err) {
      setActionError(err.message)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleOccupyPuesto = async () => {
    setBusy(true)
    setActionError('')
    try {
      await occupyBarSeat(
        selected.item.id,
        clientName.trim() || `Cliente ${selected.item.orden}`
      )
      navigate(`/pedido/barra/${selected.item.id}`)
    } catch (err) {
      setActionError(err.message)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const tileClass = (estado) =>
    `flex aspect-square flex-col items-center justify-center rounded-2xl p-2 text-white ` +
    `transition-transform active:scale-95 ` +
    (estado === 'libre'
      ? 'bg-green-600 hover:bg-green-500'
      : 'bg-red-600 hover:bg-red-500')

  return (
    <div className="min-h-screen bg-slate-900">
      <TopBar />

      <main className="mx-auto max-w-5xl space-y-8 p-4">
        {loading && <p className="text-slate-400">Cargando mapa...</p>}
        {error && <p className="font-medium text-red-400">{error}</p>}

        {floors.map((floor) => (
          <section key={floor.id}>
            <h2 className="mb-3 text-lg font-bold text-white">{floor.nombre}</h2>
            {floor.tables.length === 0 && (
              <p className="text-sm text-slate-500">Sin mesas en este piso.</p>
            )}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {floor.tables.map((mesa) => (
                <button
                  key={mesa.id}
                  type="button"
                  onClick={() => handleMesa(mesa)}
                  className={tileClass(mesa.estado)}
                >
                  <span className="text-lg font-bold">{mesa.nombre}</span>
                  <span className="text-xs opacity-80">
                    {mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {barSeats.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Barra</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {barSeats.map((puesto) => (
                <button
                  key={puesto.id}
                  type="button"
                  onClick={() => handlePuesto(puesto)}
                  className={tileClass(puesto.estado)}
                >
                  <span className="text-lg font-bold">{puesto.nombre}</span>
                  <span className="max-w-full truncate text-xs opacity-80">
                    {puesto.estado === 'libre' ? 'Libre' : puesto.nombre_cliente}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Abrir mesa libre */}
      {selected?.type === 'mesa' && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-6">
            <h2 className="text-xl font-bold text-white">{selected.item.nombre}</h2>
            <p className="text-slate-300">
              ¿Abrir esta mesa? Se creara la primera sub-cuenta (Cliente 1).
            </p>
            {actionError && <p className="font-medium text-red-400">{actionError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleOpenMesa}
                className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                Abrir mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ocupar puesto de barra libre */}
      {selected?.type === 'puesto' && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-6">
            <h2 className="text-xl font-bold text-white">{selected.item.nombre}</h2>
            <label className="block text-sm text-slate-300">
              Nombre del cliente (opcional)
              <input
                className="mt-1 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Cliente ${selected.item.orden}`}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </label>
            {actionError && <p className="font-medium text-red-400">{actionError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleOccupyPuesto}
                className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                Ocupar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FloorMap
