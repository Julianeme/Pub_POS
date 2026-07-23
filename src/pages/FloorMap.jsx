import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import ExpenseModal from '../components/ExpenseModal'
import CourtesyModal from '../components/CourtesyModal'
import ProductQtyModal from '../components/ProductQtyModal'
import Calculator from '../components/Calculator'
import { useBarLayout } from '../hooks/useBarLayout'
import { useEmployee } from '../context/EmployeeContext'
import { openTable, occupyBarSeat } from '../lib/layout'
import { addIceExpense } from '../lib/expenses'
import { addCourtesies } from '../lib/courtesies'
import { addProductLoss, MERMA_MOTIVOS } from '../lib/losses'
import { canGiveCourtesy, canBuyIce, canManageCash } from '../lib/permissions'

// Pantalla principal: mapa de pisos con mesas y barra con puestos.
// Verde = libre, rojo = ocupada/o. Tocar algo ocupado abre su pedido.
function FloorMap() {
  const { floors, barSeats, loading, error, refresh } = useBarLayout()
  const { employee } = useEmployee()
  const navigate = useNavigate()

  // selected: null | { type: 'mesa', item } | { type: 'puesto', item } (solo libres)
  const [selected, setSelected] = useState(null)
  const [clientName, setClientName] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  // Modales de acciones fijas: null | 'hielo' | 'cortesia' | 'merma' | 'calc'
  const [opModal, setOpModal] = useState(null)
  const [opBusy, setOpBusy] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleIce = async (cantidad, costoUnitario) => {
    setOpBusy(true)
    try {
      await addIceExpense({ cantidad, costoUnitario, empleadoId: employee.id })
      setOpModal(null)
      showToast('Compra de hielo registrada')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setOpBusy(false)
    }
  }

  const handleCourtesy = async (items, motivo, motivoDetalle) => {
    setOpBusy(true)
    try {
      await addCourtesies({ items, empleadoId: employee.id, motivo, motivoDetalle })
      setOpModal(null)
      showToast('Cortesia registrada')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setOpBusy(false)
    }
  }

  const handleMerma = async (productId, cantidad, nota) => {
    setOpBusy(true)
    try {
      await addProductLoss({ tipo: 'merma', productId, cantidad, descripcion: nota, empleadoId: employee.id })
      setOpModal(null)
      showToast('Merma registrada')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setOpBusy(false)
    }
  }

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

      {/* Acciones fijas disponibles durante el servicio (segun rol) */}
      <div className="sticky top-0 z-10 flex flex-wrap gap-2 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            setActionError('')
            setOpModal('merma')
          }}
          className="flex-1 rounded-xl bg-amber-700 py-3 font-semibold text-white hover:bg-amber-600"
        >
          💥 Merma / rotura
        </button>
        {canGiveCourtesy(employee) && (
          <button
            type="button"
            onClick={() => {
              setActionError('')
              setOpModal('cortesia')
            }}
            className="flex-1 rounded-xl bg-purple-700 py-3 font-semibold text-white hover:bg-purple-600"
          >
            🎁 Cortesia
          </button>
        )}
        {canBuyIce(employee) && (
          <button
            type="button"
            onClick={() => {
              setActionError('')
              setOpModal('hielo')
            }}
            className="flex-1 rounded-xl bg-cyan-700 py-3 font-semibold text-white hover:bg-cyan-600"
          >
            🧊 Hielo
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setActionError('')
            setOpModal('calc')
          }}
          className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600"
        >
          🧮 Calculadora
        </button>
        {canManageCash(employee) && (
          <Link
            to="/caja"
            className="flex-1 rounded-xl bg-slate-700 py-3 text-center font-semibold text-white hover:bg-slate-600"
          >
            💵 Caja y Gastos
          </Link>
        )}
      </div>

      <main className="mx-auto max-w-5xl space-y-8 p-4">
        {loading && <p className="text-slate-400">Cargando mapa...</p>}
        {error && <p className="font-medium text-red-400">{error}</p>}
        {actionError && !selected && !opModal && (
          <p className="font-medium text-red-400">{actionError}</p>
        )}

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

      {/* Comprar hielo */}
      {opModal === 'hielo' && (
        <ExpenseModal onSave={handleIce} onClose={() => setOpModal(null)} busy={opBusy} />
      )}

      {/* Regalar cortesia */}
      {opModal === 'cortesia' && (
        <CourtesyModal onSave={handleCourtesy} onClose={() => setOpModal(null)} busy={opBusy} />
      )}

      {/* Merma / rotura */}
      {opModal === 'merma' && (
        <ProductQtyModal
          icon="💥"
          title="Merma / rotura"
          confirmLabel="Registrar merma"
          motivos={MERMA_MOTIVOS}
          onSave={handleMerma}
          onClose={() => setOpModal(null)}
          busy={opBusy}
        />
      )}

      {/* Calculadora */}
      {opModal === 'calc' && <Calculator onClose={() => setOpModal(null)} />}

      {/* Aviso temporal de exito */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-green-600 px-6 py-3 font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

export default FloorMap
