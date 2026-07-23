import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useOrder } from '../hooks/useOrder'
import { useEmployee } from '../context/EmployeeContext'
import ProductPicker from '../components/ProductPicker'
import SeatCard from '../components/SeatCard'
import PaymentModal from '../components/PaymentModal'
import CourtesyModal from '../components/CourtesyModal'
import { useConfirm } from '../components/ConfirmModal'
import { addCourtesies } from '../lib/courtesies'
import { money } from '../lib/format'
import {
  addOrderItems,
  voidOrderItem,
  updateOrderItemQuantity,
  addTableSeat,
  renameTableSeat,
  cancelTable,
  cancelBarSeat,
  fetchTableOrder,
} from '../lib/orders'
import { payTableSeat, payWholeTable, payBarSeat } from '../lib/payments'
import { renameBarSeatClient, setTableGroupPromos } from '../lib/layout'
import { listActivePromotions, activePromoForProduct } from '../lib/promotions'

// Pantalla de pedido de una mesa (con sub-cuentas) o un puesto de barra.
// Ruta: /pedido/mesa/:id  |  /pedido/barra/:id
function OrderScreen() {
  const { tipo, id } = useParams()
  const navigate = useNavigate()
  const { employee } = useEmployee()
  const { order, loading, error, refresh } = useOrder(tipo, id)
  const { confirm, confirmModal } = useConfirm()

  const [pickerSeat, setPickerSeat] = useState(null) // sub-cuenta destino del producto
  const [courtesySeat, setCourtesySeat] = useState(null) // sub-cuenta destino de la cortesia
  const [confirmCourtesySeat, setConfirmCourtesySeat] = useState(null) // paso de confirmacion
  const [renameSeat, setRenameSeat] = useState(null) // sub-cuenta en renombre
  const [renameValue, setRenameValue] = useState('')
  const [confirmFree, setConfirmFree] = useState(false)
  // payTarget: null | { scope: 'seat'|'mesa', id, titulo, monto }
  const [payTarget, setPayTarget] = useState(null)
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
        setCourtesySeat(null)
        setRenameSeat(null)
        setConfirmFree(false)
      }
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleAddProducts = (items) =>
    run(async () => {
      // Evalua promos activas AHORA y "congela" la promo en cada item
      const promos = await listActivePromotions()
      const now = new Date()
      const enriched = items.map(({ product, cantidad }) => {
        const promo = activePromoForProduct(promos, product.id, now)
        return {
          product,
          cantidad,
          promoTipo: promo?.tipo ?? null,
          promoNombre: promo?.nombre ?? null,
          promoValor: promo?.tipo === 'porcentaje' ? promo.porcentaje : null,
        }
      })
      await addOrderItems({
        tableSeatId: tipo === 'mesa' ? pickerSeat.id : null,
        barSeatId: tipo === 'barra' ? pickerSeat.id : null,
        items: enriched,
        empleadoId: employee.id,
      })
    })

  const handleVoidItem = async (item) => {
    const ok = await confirm({
      icon: '🗑️',
      title: 'Quitar producto',
      message: `Se quitara ${item.cantidad} × ${item.nombre_producto} de la cuenta.`,
      confirmLabel: 'Quitar',
    })
    if (!ok) return
    run(() => voidOrderItem(item.id))
  }

  // Paso de confirmacion (modal propio) antes de abrir el registro de
  // cortesia, para no regalar por error al operar en tablet.
  const requestCourtesy = (seat) => {
    setActionError('')
    setConfirmCourtesySeat(seat)
  }

  const confirmCourtesy = () => {
    const seat = confirmCourtesySeat
    setConfirmCourtesySeat(null)
    setCourtesySeat(seat)
  }

  // Cortesia ligada a la sub-cuenta abierta (mesa) o al puesto (barra)
  const handleSeatCourtesy = (items, motivo, motivoDetalle) =>
    run(() =>
      addCourtesies({
        items,
        empleadoId: employee.id,
        motivo,
        motivoDetalle,
        tableSeatId: tipo === 'mesa' ? courtesySeat.id : null,
        barSeatId: tipo === 'barra' ? courtesySeat.id : null,
      })
    )

  // Ajuste de a 1 en 1 (ej. 6 -> 5 cervezas) sin pasar por quitar+agregar.
  // Bajar a 0 equivale a quitar el item; no pide confirmacion extra porque
  // el propio boton "-" ya es una accion deliberada.
  const handleChangeQty = (item, nuevaCantidad) =>
    run(() => updateOrderItemQuantity(item.id, nuevaCantidad))

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

  const handleToggleGroup = () =>
    run(() => setTableGroupPromos(order.id, !order.agruparPromos), { close: false })

  // ---- Cobro ----

  const openPaySeat = (seat) => {
    setActionError('')
    setPayTarget({ scope: 'seat', id: seat.id, titulo: `Cobrar ${seat.nombre}`, monto: seat.total })
  }

  const openPayTable = () => {
    setActionError('')
    setPayTarget({ scope: 'mesa', id: order.id, titulo: 'Cobrar toda la mesa', monto: order.total })
  }

  // Ejecuta el cobro segun el destino y navega al mapa si la mesa/puesto
  // quedo libre (barra siempre se libera; mesa solo cuando no quedan
  // sub-cuentas abiertas).
  const executePay = async (metodo) => {
    setBusy(true)
    setActionError('')
    try {
      if (tipo === 'barra') {
        await payBarSeat(order.id, metodo, employee.id, order.total)
        navigate('/', { replace: true })
        return
      }
      if (payTarget.scope === 'mesa') {
        await payWholeTable(order.seats, metodo, employee.id)
        navigate('/', { replace: true })
        return
      }
      // Cobro de una sub-cuenta: puede o no ser la ultima
      await payTableSeat(payTarget.id, metodo, employee.id, payTarget.monto)
      const fresh = await fetchTableOrder(order.id)
      if (fresh.estado === 'libre') {
        navigate('/', { replace: true })
        return
      }
      setPayTarget(null)
      await refresh()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

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
        {actionError && !pickerSeat && !renameSeat && !confirmFree && !payTarget && (
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

        {order && !isFree && tipo === 'mesa' && (
          <button
            type="button"
            onClick={handleToggleGroup}
            disabled={busy}
            className="flex w-full items-center justify-between rounded-xl bg-slate-800 px-5 py-3 text-left disabled:opacity-50"
          >
            <span>
              <span className="font-semibold text-white">Agrupar promociones de la mesa</span>
              <span className="block text-xs text-slate-400">
                {order.agruparPromos
                  ? 'El 2x1 se reparte entre las sub-cuentas de la mesa'
                  : 'El 2x1 se aplica dentro de cada sub-cuenta por separado'}
              </span>
            </span>
            <span
              className={`ml-3 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
                order.agruparPromos ? 'bg-green-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white transition-transform ${
                  order.agruparPromos ? 'translate-x-5' : ''
                }`}
              />
            </span>
          </button>
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
                  onChangeQty={handleChangeQty}
                  onVoidItem={handleVoidItem}
                  onRename={() => openRename(seat)}
                  onPay={() => openPaySeat(seat)}
                  onCourtesy={() => requestCourtesy(seat)}
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
              <div className="space-y-3 rounded-2xl bg-slate-800 px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-300">Total de la mesa</p>
                  <p className="text-xl font-bold text-green-400">{money(order.total)}</p>
                </div>
                {order.total > 0 && (
                  <button
                    type="button"
                    onClick={openPayTable}
                    disabled={busy}
                    className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                  >
                    Cobrar toda la mesa de una vez
                  </button>
                )}
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
              Liberar {tipo === 'mesa' ? 'mesa' : 'puesto'} sin cobrar (cortesia / error)
            </button>
          </>
        )}
      </main>

      {/* Selector de producto */}
      {pickerSeat && (
        <ProductPicker
          title={`Agregar a ${pickerSeat.nombre}`}
          busy={busy}
          onAdd={handleAddProducts}
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
              Se anulara todo el consumo activo ({money(order.total)}) y {tipo === 'mesa' ? 'la mesa' : 'el puesto'}{' '}
              quedara libre sin registrar cobro. Usar solo para cortesias o errores.
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

      {/* Cobro */}
      {payTarget && (
        <PaymentModal
          titulo={payTarget.titulo}
          monto={payTarget.monto}
          busy={busy}
          error={actionError}
          onPay={executePay}
          onClose={() => setPayTarget(null)}
        />
      )}

      {/* Confirmar antes de registrar una cortesia */}
      {confirmCourtesySeat && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-5 rounded-2xl bg-slate-800 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/20 text-4xl">
              🎁
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Registrar una cortesia</h2>
              <p className="text-slate-300">
                Vas a regalar productos <span className="font-semibold text-white">sin cobro</span> a{' '}
                <span className="font-semibold text-white">{confirmCourtesySeat.nombre}</span>.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmCourtesySeat(null)}
                className="flex-1 rounded-xl bg-slate-700 py-3 text-lg font-semibold text-white hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCourtesy}
                className="flex-1 rounded-xl bg-purple-600 py-3 text-lg font-semibold text-white hover:bg-purple-500"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cortesia a esta sub-cuenta / puesto */}
      {courtesySeat && (
        <CourtesyModal
          subtitulo={`${order?.nombre ?? ''} · ${courtesySeat.nombre}`}
          busy={busy}
          onSave={handleSeatCourtesy}
          onClose={() => setCourtesySeat(null)}
        />
      )}

      {confirmModal}
    </div>
  )
}

export default OrderScreen
