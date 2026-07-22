import { money } from '../lib/format'

// Muestra el motivo de una cortesia (con detalle si el motivo es "Otro").
function motivoTexto(c) {
  if (!c.motivo) return 'Cortesia'
  if (c.motivo === 'Otro' && c.motivo_detalle) return `Cortesia: ${c.motivo_detalle}`
  return `Cortesia: ${c.motivo}`
}

// Tarjeta de una sub-cuenta (o del puesto de barra): items, total y acciones.
// onChangeQty(item, nuevaCantidad) ajusta de a 1 en 1 sin borrar el item;
// onVoidItem(item) lo quita por completo (anula, conserva historial);
// onPay() abre el cobro de esta sub-cuenta (opcional);
// onCourtesy() abre el registro de una cortesia para esta sub-cuenta.
function SeatCard({ seat, onAddProduct, onChangeQty, onVoidItem, onRename, onPay, onCourtesy, busy }) {
  const courtesies = seat.courtesies ?? []
  return (
    <section className="rounded-2xl bg-slate-800 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-lg font-bold text-white">{seat.nombre}</h3>
        <div className="flex shrink-0 gap-2">
          {onCourtesy && (
            <button
              type="button"
              onClick={onCourtesy}
              disabled={busy}
              className="rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
            >
              🎁 Cortesia
            </button>
          )}
          {onRename && (
            <button
              type="button"
              onClick={onRename}
              disabled={busy}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
            >
              Renombrar
            </button>
          )}
        </div>
      </div>

      {seat.items.length === 0 ? (
        <p className="mb-3 text-sm text-slate-500">Sin consumo todavia.</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {seat.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-white">{item.nombre_producto}</p>
                <p className="text-xs text-slate-500">{money(item.precio_unitario)} c/u</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeQty(item, item.cantidad - 1)}
                  disabled={busy}
                  aria-label={`Quitar una unidad de ${item.nombre_producto}`}
                  className="h-8 w-8 rounded-lg bg-slate-700 text-lg font-bold text-white hover:bg-slate-600 disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold text-white">
                  {item.cantidad}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeQty(item, item.cantidad + 1)}
                  disabled={busy}
                  aria-label={`Agregar una unidad de ${item.nombre_producto}`}
                  className="h-8 w-8 rounded-lg bg-slate-700 text-lg font-bold text-white hover:bg-slate-600 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <span className="w-20 shrink-0 text-right font-semibold text-white">
                {money(item.cantidad * item.precio_unitario)}
              </span>

              <button
                type="button"
                onClick={() => onVoidItem(item)}
                disabled={busy}
                aria-label={`Quitar ${item.nombre_producto} de la cuenta`}
                className="h-8 w-8 shrink-0 rounded-lg bg-red-900/60 text-red-200 hover:bg-red-800 disabled:opacity-40"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Cortesias regaladas a esta sub-cuenta (no suman al total) */}
      {courtesies.length > 0 && (
        <ul className="mb-3 space-y-1 rounded-xl bg-purple-950/40 p-3">
          {courtesies.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-purple-200">
                🎁 {c.cantidad} × {c.nombre_producto}
              </span>
              <span className="shrink-0 text-xs text-purple-300/80">{motivoTexto(c)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-700 pt-3">
        <button
          type="button"
          onClick={onAddProduct}
          disabled={busy}
          className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          + Agregar
        </button>
        <p className="text-lg font-bold text-white">{money(seat.total)}</p>
      </div>

      {onPay && seat.total > 0 && (
        <button
          type="button"
          onClick={onPay}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
        >
          Cobrar {seat.nombre}
        </button>
      )}
    </section>
  )
}

export default SeatCard
