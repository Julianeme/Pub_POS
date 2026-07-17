import { useEffect, useState } from 'react'
import { checkConnection } from '../lib/supabase'

function Home() {
  const [status, setStatus] = useState({ state: 'loading', message: 'Conectando...' })

  useEffect(() => {
    let cancelled = false
    checkConnection().then((result) => {
      if (cancelled) return
      setStatus({
        state: result.ok ? 'connected' : 'error',
        message: result.message,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const colors = {
    loading: 'bg-yellow-500',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  }

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-bold text-white">POS Bar</h1>
      <p className="text-slate-400">Sistema de punto de venta</p>

      <div className="flex items-center gap-3 rounded-xl bg-slate-800 px-6 py-4">
        <span className={`h-3 w-3 rounded-full ${colors[status.state]}`} />
        <span className="text-lg text-white">{status.message}</span>
      </div>

      <p className="text-sm text-slate-500">Supabase · Fase 0</p>
    </main>
  )
}

export default Home
