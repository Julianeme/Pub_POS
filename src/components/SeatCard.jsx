import { money } from '../lib/format'

// Tarjeta de una sub-cuenta (o del puesto de barra): items, total y acciones.
function SeatCard({ seat, onAddProduct, onVoidItem, onRename, busy }) {
  return (
    <section className="rounded-2xl bg-slate-800 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="truncate text-lg font-bold text-white">{seat.nombre}</h3>
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

      {seat.items.length === 0 ? (
        <p className="mb-3 text-sm text-slate-500">Sin consumo todavia.</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {seat.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-white">
                  {item.cantidad} × {item.nombre_producto}
                </p>
                <p className="text-xs text-slate-500">{money(item.precio_unitario)} c/u</p>
              </div>
              <span className="font-semibold text-white">
                {money(item.cantidad * item.precio_unitario)}
              </span>
              <button
                type="button"
                onClick={() => onVoidItem(item)}
                disabled={busy}
                aria-label={`Quitar ${item.nombre_producto}`}
                className="h-8 w-8 rounded-lg bg-red-900/60 text-red-200 hover:bg-red-800 disabled:opacity-40"
              >
                ×
              </button>
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
    </section>
  )
}

export default SeatCard
