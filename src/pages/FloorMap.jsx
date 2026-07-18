import { useState } from 'react'
import TopBar from '../components/TopBar'
import { useBarLayout } from '../hooks/useBarLayout'
import {
  openTable,
  freeTable,
  occupyBarSeat,
  renameBarSeatClient,
  freeBarSeat,
} from '../lib/layout'

// Pantalla principal: mapa de pisos con mesas y barra con puestos.
// Verde = libre, rojo = ocupada/o.
function FloorMap() {
  const { floors, barSeats, loading, error, refresh } = useBarLayout()

  // selected: null | { type: 'mesa', item } | { type: 'puesto', item }
  const [selected, setSelected] = useState(null)
  const [clientName, setClientName] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const openMesaDialog = (mesa) => {
    setActionError('')
    setSelected({ type: 'mesa', item: mesa })
  }

  const openPuestoDialog = (puesto) => {
    setActionError('')
    setClientName(puesto.nombre_cliente ?? '')
    setSelected({ type: 'puesto', item: puesto })
  }

  const close = () => setSelected(null)

  const run = async (action) => {
    setBusy(true)
    setActionError('')
    try {
      await action()
      await refresh()
      close()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const seatDefaultName = (puesto) => `Cliente ${puesto.orden}`

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
                  onClick={() => openMesaDialog(mesa)}
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
                  onClick={() => openPuestoDialog(puesto)}
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

      {/* Dialogo de mesa */}
      {selected?.type === 'mesa' && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-6">
            <h2 className="text-xl font-bold text-white">{selected.item.nombre}</h2>

            {selected.item.estado === 'libre' ? (
              <p className="text-slate-300">¿Abrir esta mesa?</p>
            ) : (
              <p className="text-slate-300">
                Mesa ocupada. Liberarla la pondra en ceros (provisional hasta la
                fase de cobro).
              </p>
            )}

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
              {selected.item.estado === 'libre' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => openTable(selected.item.id))}
                  className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                >
                  Abrir mesa
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => freeTable(selected.item.id))}
                  className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  Liberar mesa
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialogo de puesto de barra */}
      {selected?.type === 'puesto' && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-6">
            <h2 className="text-xl font-bold text-white">{selected.item.nombre}</h2>

            <label className="block text-sm text-slate-300">
              Nombre del cliente (opcional)
              <input
                className="mt-1 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={seatDefaultName(selected.item)}
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

              {selected.item.estado === 'libre' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      occupyBarSeat(
                        selected.item.id,
                        clientName.trim() || seatDefaultName(selected.item)
                      )
                    )
                  }
                  className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                >
                  Ocupar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        renameBarSeatClient(
                          selected.item.id,
                          clientName.trim() || seatDefaultName(selected.item)
                        )
                      )
                    }
                    className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => freeBarSeat(selected.item.id))}
                    className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Liberar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FloorMap
