import { useEffect, useState } from 'react'
import { useEmployee } from '../context/EmployeeContext'
import BackButton from '../components/BackButton'
import { money } from '../lib/format'
import { canSeeAllReports } from '../lib/permissions'
import { listClosings } from '../lib/closings'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function mesLabel(key) {
  const [y, m] = key.split('-')
  return `${MESES[Number(m) - 1]} ${y}`
}

function ReportsScreen() {
  const { employee } = useEmployee()
  const soloPropios = !canSeeAllReports(employee)

  const [closings, setClosings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listClosings(soloPropios ? { soloEmpleadoId: employee.id } : {})
      .then(setClosings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [soloPropios, employee.id])

  // Agrupa por mes de la fecha de cierre
  const grupos = {}
  for (const c of closings) {
    const d = new Date(c.closed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    grupos[key] ??= { cierres: [], ventas: 0, gastos: 0, neto: 0 }
    grupos[key].cierres.push(c)
    grupos[key].ventas += Number(c.ventas_total)
    grupos[key].gastos += Number(c.gastos_total)
    grupos[key].neto += Number(c.neto)
  }
  const meses = Object.keys(grupos).sort().reverse()

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <div className="mb-3">
            <BackButton to="/cierre" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reportes</h1>
          <p className="text-sm text-slate-400">
            {soloPropios
              ? 'Cierres en los que participaste, agrupados por mes.'
              : 'Cierres de caja agrupados por mes.'}
          </p>
        </div>

        {error && <p className="font-medium text-red-400">{error}</p>}
        {loading && <p className="text-slate-400">Cargando...</p>}
        {!loading && closings.length === 0 && (
          <p className="text-slate-400">Aun no hay cierres guardados.</p>
        )}

        {meses.map((key) => {
          const g = grupos[key]
          return (
            <section key={key} className="space-y-3">
              <div className="rounded-2xl bg-slate-800 p-5">
                <h2 className="text-lg font-bold capitalize text-white">{mesLabel(key)}</h2>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-900/50 p-3">
                    <p className="text-xs text-slate-400">Ventas</p>
                    <p className="font-bold text-white">{money(g.ventas)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/50 p-3">
                    <p className="text-xs text-slate-400">Gastos</p>
                    <p className="font-bold text-red-400">{money(g.gastos)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/50 p-3">
                    <p className="text-xs text-slate-400">Neto</p>
                    <p className="font-bold text-green-400">{money(g.neto)}</p>
                  </div>
                </div>
              </div>

              <ul className="space-y-2">
                {g.cierres.map((c) => (
                  <li key={c.id} className="rounded-xl bg-slate-800/60 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">
                        {new Date(c.opened_at).toLocaleDateString('es-CO')} →{' '}
                        {new Date(c.closed_at).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-semibold text-white">{money(c.ventas_total)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                      <span>Neto {money(c.neto)}</span>
                      <span>Gastos {money(c.gastos_total)}</span>
                      <span>Propinas {money(c.propinas_recaudadas)}</span>
                      {c.diferencia != null && (
                        <span className={c.diferencia < 0 ? 'text-red-400' : 'text-green-400'}>
                          Dif. caja {money(c.diferencia)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </main>
  )
}

export default ReportsScreen
