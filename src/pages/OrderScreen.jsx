import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useOrder } from '../hooks/useOrder'
import { useEmployee } from '../context/EmployeeContext'
import ProductPicker from '../components/ProductPicker'
import SeatCard from '../components/SeatCard'
import { money } from '../lib/format'
import {
  addOrderItem,
  voidOrderItem,
  addTableSeat,
  renameTableSeat,
  cancelTable,
  cancelBarSeat,
} from '../lib/orders'
import { renameBarSeatClient } from '../lib/layout'

// Pantalla de pedido de una mesa (con sub-cuentas) o un puesto de barra.
// Ruta: /pedido/mesa/:id  |  /pedido/barra/:id
function OrderScreen() {
  const { tipo, id } = useParams()
  const navigate = useNavigate()
  const { employee } = useEmployee()
  const { order, loading, error, refresh } = useOrder(tipo, id)

  const [pickerSeat, setPickerSeat] = useState(null) // sub-cuenta destino del producto
  const [renameSeat, setRenameSeat] = useState(null) // sub-cuenta en renombre
  const [renameValue, setRenameValue] = useState('')
  const [confirmFree, setConfirmFree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  if (tipo !== 'mesa' && tipo !== 'barra') return <Navigate to="/" replace />

  const run = async (action, { close = true } = {}) => {
    setBusy(true)
    setActionError('')
    try {
      await action()
      await refresh()
      if (close) {
        setPickerSeat(null)
        setRenameSeat(null)
        setConfirmFree(false)
      }
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleAddProduct = (product, cantidad) =>
    run(() =>
      addOrderItem({
        tableSeatId: tipo === 'mesa' ? pickerSeat.id : null,
        barSeatId: tipo === 'barra' ? pickerSeat.id : null,
        product,
        cantidad,
        empleadoId: employee.id,
      })
    )

  const handleVoidItem = (item) => {
    if (!window.confirm(`¿Quitar ${item.cantidad} × ${item.nombre_producto}?`)) return
    run(() => voidOrderItem(item.id))
  }

  // Siguiente "Cliente N" a partir de los nombres existentes
  const handleAddSeat = () => {
    const nums = order.seats
      .map((s) => /^Cliente (\d+)$/.exec(s.nombre)?.[1])
      .filter(Boolean)
      .map(Number)
    const next = Math.max(0, ...nums) + 1
    run(() => addTableSeat(order.id, `Cliente ${next}`))
  }

  const openRename = (seat) => {
    setRenameValue(seat.nombre)
    setRenameSeat(seat)
    setActionError('')
  }

  const handleRename = (e) => {
    e.preventDefault()
    const nombre = renameValue.trim()
    if (!nombre) return
    run(() =>
      tipo === 'mesa'
        ? renameTableSeat(renameSeat.id, nombre)
        : renameBarSeatClient(renameSeat.id, nombre)
    )
  }

  const handleFree = () =>
    run(async () => {
      if (tipo === 'mesa') await cancelTable(order.id)
      else await cancelBarSeat(order.id)
      navigate('/', { replace: true })
    })

  const isFree = order && (order.estado === 'libre' || (tipo === 'barra' && order.seats.length === 0))

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          >
            ← Mapa
          </Link>
          <h1 className="text-xl font-bold text-white">
            {order ? order.nombre : 'Cargando...'}
            {tipo === 'barra' && order?.seats[0] && (
              <span className="ml-2 text-base font-normal text-slate-400">
                {order.seats[0].nombre}
              </span>
            )}
          </h1>
        </div>
        {order && !isFree && (
          <p className="text-xl font-bold text-green-400">{money(order.total)}</p>
        )}
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {loading && <p className="text-slate-400">Cargando pedido...</p>}
        {error && <p className="font-medium text-red-400">{error}</p>}
        {actionError && !pickerSeat && !renameSeat && !confirmFree && (
          <p className="font-medium text-red-400">{actionError}</p>
        )}

        {order && isFree && (
          <div className="rounded-2xl bg-slate-800 p-6 text-center">
            <p className="text-slate-300">
              {tipo === 'mesa' ? 'Esta mesa esta libre.' : 'Este puesto esta libre.'}
            </p>
            <Link to="/" className="mt-2 inline-block text-blue-400 underline">
              Volver al mapa para abrirlo
            </Link>
          </div>
        )}

        {order && !isFree && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {order.seats.map((seat) => (
                <SeatCard
                  key={seat.id}
                  seat={seat}
                  busy={busy}
                  onAddProduct={() => {
                    setActionError('')
                    setPickerSeat(seat)
                  }}
                  onVoidItem={handleVoidItem}
                  onRename={() => openRename(seat)}
                />
              ))}
            </div>

            {tipo === 'mesa' && (
              <button
                type="button"
                onClick={handleAddSeat}
                disabled={busy}
                className="w-full rounded-2xl border-2 border-dashed border-slate-700 py-4 font-semibold text-slate-400 hover:border-slate-500 hover:text-white disabled:opacity-50"
              >
                + Agregar sub-cuenta
              </button>
            )}

            {tipo === 'mesa' && order.seats.length > 1 && (
              <div className="flex items-center justify-between rounded-2xl bg-slate-800 px-5 py-4">
                <p className="font-semibold text-slate-300">Total de la mesa</p>
                <p className="text-xl font-bold text-green-400">{money(order.total)}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setActionError('')
                setConfirmFree(true)
              }}
              disabled={busy}
              className="w-full rounded-2xl bg-red-900/40 py-3 font-semibold text-red-300 hover:bg-red-900/70 disabled:opacity-50"
            >
              Liberar {tipo === 'mesa' ? 'mesa' : 'puesto'} sin cobrar (anula el consumo)
            </button>
          </>
        )}
      </main>

      {/* Selector de producto */}
      {pickerSeat && (
        <ProductPicker
          title={`Agregar a ${pickerSeat.nombre}`}
          busy={busy}
          onAdd={handleAddProduct}
          onClose={() => setPickerSeat(null)}
        />
      )}

      {/* Renombrar sub-cuenta / cliente de barra */}
      {renameSeat && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleRename}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-6"
          >
            <h2 className="text-xl font-bold text-white">Nombre</h2>
            <input
              autoFocus
              className="w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
            {actionError && <p className="font-medium text-red-400">{actionError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRenameSeat(null)}
                className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || !renameValue.trim()}
                className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmar liberar sin cobrar */}
      {confirmFree && order && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-6">
            <h2 className="text-xl font-bold text-white">¿Liberar sin cobrar?</h2>
            <p className="text-slate-300">
              Se anulara todo el consumo activo ({money(order.total)}). Esta opcion es
              provisional hasta que exista la pantalla de cobro.
            </p>
            {actionError && <p className="font-medium text-red-400">{actionError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmFree(false)}
                className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleFree}
                className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                Liberar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderScreen
