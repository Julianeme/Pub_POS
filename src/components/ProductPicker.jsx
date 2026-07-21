import { useEffect, useMemo, useState } from 'react'
import { CATEGORIAS, listActiveProducts } from '../lib/products'
import { money } from '../lib/format'

// Modal para armar un pedido con VARIOS productos a la vez y agregarlos en
// un solo paso. onAdd(items) donde items = [{ product, cantidad }].
function ProductPicker({ title, onAdd, onClose, busy }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoria, setCategoria] = useState('coctel')
  // cart: { [productId]: { product, cantidad } }
  const [cart, setCart] = useState({})

  useEffect(() => {
    listActiveProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const visible = products.filter((p) => p.categoria === categoria)

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
  const totalPrecio = useMemo(
    () => cartList.reduce((s, it) => s + it.cantidad * it.product.precio_publico, 0),
    [cart] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const confirm = () => {
    if (totalUnidades === 0) return
    onAdd(cartList.map(({ product, cantidad }) => ({ product, cantidad })))
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col gap-4 rounded-t-2xl bg-slate-800 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
          >
            Cerrar
          </button>
        </div>

        {/* Categorias */}
        <div className="flex gap-2">
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

        {/* Lista de productos: tocar agrega 1 al carrito */}
        <div className="min-h-28 flex-1 overflow-y-auto">
          {loading && <p className="text-slate-400">Cargando catalogo...</p>}
          {error && <p className="font-medium text-red-400">{error}</p>}
          {!loading && visible.length === 0 && (
            <p className="text-sm text-slate-500">Sin productos activos en esta categoria.</p>
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
                    <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-green-500 px-1.5 text-sm font-bold text-white">
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
        <div className="border-t border-slate-700 pt-3">
          {cartList.length === 0 ? (
            <p className="pb-1 text-sm text-slate-500">
              Toca productos para agregarlos. Puedes mezclar categorias.
            </p>
          ) : (
            <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto">
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
                  <span className="w-20 shrink-0 text-right text-white">
                    {money(it.cantidad * it.product.precio_publico)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            disabled={totalUnidades === 0 || busy}
            onClick={confirm}
            className="h-12 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-500 disabled:opacity-40"
          >
            {totalUnidades === 0
              ? 'Elige productos'
              : `Agregar ${totalUnidades} ${totalUnidades === 1 ? 'producto' : 'productos'} · ${money(totalPrecio)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductPicker
