import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchTableOrder, fetchBarSeatOrder } from '../lib/orders'

// Carga el pedido de una mesa o puesto de barra y lo mantiene sincronizado
// en tiempo real (otras tablets agregando items, sub-cuentas, etc.).
export function useOrder(kind, id) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const data = kind === 'mesa' ? await fetchTableOrder(id) : await fetchBarSeatOrder(id)
      setOrder(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [kind, id])

  useEffect(() => {
    refresh()

    const channel = supabase
      .channel(`order-${kind}-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_seats' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bar_seats' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh, kind, id])

  return { order, loading, error, refresh }
}
