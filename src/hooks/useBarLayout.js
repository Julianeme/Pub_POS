import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchLayout } from '../lib/layout'

// Carga el mapa del bar y lo mantiene sincronizado en tiempo real:
// cualquier cambio en floors/tables/bar_seats (desde esta u otra tablet)
// dispara una recarga automatica.
export function useBarLayout() {
  const [floors, setFloors] = useState([])
  const [barSeats, setBarSeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLayout()
      setFloors(data.floors)
      setBarSeats(data.barSeats)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()

    const channel = supabase
      .channel('bar-layout')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'floors' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bar_seats' }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  return { floors, barSeats, loading, error, refresh }
}
