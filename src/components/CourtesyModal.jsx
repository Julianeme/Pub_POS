import { useEffect, useState } from 'react'
import { CATEGORIAS, listActiveProducts } from '../lib/products'
import { listCourtesyReasons } from '../lib/courtesies'
import { money } from '../lib/format'

// Formulario "Regalar cortesia": elegir VARIOS productos (mezclando
// categorias), un motivo, y regalarlos en un solo paso.
// No muestra el precio de costo (se registra del lado del servidor).
// onSave(items, motivo, motivoDetalle) donde items = [{ product, cantidad }].
// subtitulo: texto opcional para indicar el destino (ej. "Mesa 3 · Juan").
function CourtesyModal({ onSave, onClose, busy, subtitulo }) {
  const [products, setProducts] = useState([])
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoria, setCategoria] = useState('coctel')
  // cart: { [productId]: { product, cantidad } }
  const [cart, setCart] = useState({})
  const [motivo, setMotivo] = useState('') // nombre del motivo, o 'Otro'
  const [detalle, setDetalle] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    Promise.all([listActiveProducts(), listCourtesyReasons()])
      .then(([prods, reas]) => {
        setProducts(prods)
        setReasons(reas)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const visible = products.filter((p) => p.categoria === categoria)
  const esOtro = motivo === 'Otro'

  const addOne = (p) =>
    setCart((c) => ({
      ...c,
      [p.id]: { product: p, cantidad: (c[p.id]?.cantidad ?? 0) + 1 },
    }))

  const changeQty = (id, delta) =>
    setCart((c) => {
      const cantidad = (c[id]?.cantidad ?? 0) + delta
      if (cantidad <= 0) {
        const { [id]: _, ...rest } = c
        return rest
      }
      return { ...c, [id]: { ...c[id], cantidad } }
    })

  const cartList = Object.entries(cart).map(([id, v]) => ({ id, ...v }))
  const totalUnidades = cartList.reduce((s, it) => s + it.cantidad, 0)

  const handleSave = () => {
    if (totalUnidades === 0) return
    if (!motivo) {
      setFormError('Elige un motivo')
      return
    }
    if (esOtro && !detalle.trim()) {
      setFormError('Escribe el motivo')
      return
    }
    setFormError('')
    onSave(
      cartList.map(({ product, cantidad }) => ({ product, cantidad })),
      motivo,
      esOtro ? detalle.trim() : null
    )
  }

  const chip = (activo) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      activo ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
    }`

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col gap-4 rounded-t-2xl bg-slate-800 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">🎁 Regalar cortesia</h2>
            {subtitulo && <p className="text-sm text-slate-400">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
          >
            Cerrar
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {loading && <p className="text-slate-400">Cargando...</p>}
          {error && <p className="font-medium text-red-400">{error}</p>}

          {!loading && (
            <>
              {/* Productos: tocar agrega 1 al carrito */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-300">1. Productos</p>
                <div className="mb-2 flex gap-2">
                  {CATEGORIAS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategoria(c.value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        categoria === c.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                {visible.length === 0 && (
                  <p className="text-sm text-slate-500">Sin productos en esta categoria.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {visible.map((p) => {
                    const enCarrito = cart[p.id]?.cantidad ?? 0
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addOne(p)}
                        className="relative rounded-xl bg-slate-700 p-3 text-left text-white hover:bg-slate-600"
                      >
                        {enCarrito > 0 && (
                          <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-purple-500 px-1.5 text-sm font-bold text-white">
                            {enCarrito}
                          </span>
                        )}
                        <span className="block pr-6 font-semibold">{p.nombre}</span>
                        <span className="text-sm opacity-80">{money(p.precio_publico)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Carrito */}
              {cartList.length > 0 && (
                <ul className="space-y-2 rounded-xl bg-slate-900/50 p-3">
                  {cartList.map((it) => (
                    <li key={it.id} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-white">
                        {it.product.nombre}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => changeQty(it.id, -1)}
                          className="h-8 w-8 rounded-lg bg-slate-700 text-lg font-bold text-white hover:bg-slate-600"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-semibold text-white">
                          {it.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(it.id, 1)}
                          className="h-8 w-8 rounded-lg bg-slate-700 text-lg font-bold text-white hover:bg-slate-600"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Motivo */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-300">2. Motivo</p>
                <div className="flex flex-wrap gap-2">
                  {reasons.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setMotivo(r.nombre)}
                      className={chip(motivo === r.nombre)}
                    >
                      {r.nombre}
                    </button>
                  ))}
                  <button type="button" onClick={() => setMotivo('Otro')} className={chip(esOtro)}>
                    Otro
                  </button>
                </div>
                {esOtro && (
                  <input
                    autoFocus
                    className="mt-2 w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Escribe el motivo"
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Guardar */}
        <div className="space-y-3 border-t border-slate-700 pt-4">
          {formError && <p className="font-medium text-red-400">{formError}</p>}
          <button
            type="button"
            disabled={totalUnidades === 0 || busy}
            onClick={handleSave}
            className="h-12 w-full rounded-xl bg-purple-600 font-semibold text-white hover:bg-purple-500 disabled:opacity-40"
          >
            {totalUnidades === 0
              ? 'Elige productos'
              : `Regalar ${totalUnidades} ${totalUnidades === 1 ? 'producto' : 'productos'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CourtesyModal
