import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NumericKeypad from '../components/NumericKeypad'
import { loginEmployee } from '../lib/employees'
import { useEmployee } from '../context/EmployeeContext'

const MAX_DIGITS = 6

// Login en dos pasos: primero código de empleado, luego PIN.
function Login() {
  const { login } = useEmployee()
  const navigate = useNavigate()

  const [step, setStep] = useState('codigo') // 'codigo' | 'pin'
  const [codigo, setCodigo] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const value = step === 'codigo' ? codigo : pin
  const setValue = step === 'codigo' ? setCodigo : setPin

  const handleDigit = (d) => {
    setError('')
    if (value.length < MAX_DIGITS) setValue(value + d)
  }

  const handleDelete = () => {
    setError('')
    setValue(value.slice(0, -1))
  }

  const handleSubmit = async () => {
    if (!value) return
    if (step === 'codigo') {
      setStep('pin')
      return
    }
    setLoading(true)
    setError('')
    try {
      const emp = await loginEmployee(codigo, pin)
      if (emp) {
        login(emp)
        navigate('/', { replace: true })
      } else {
        setError('Código o PIN incorrectos')
        setPin('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('codigo')
    setPin('')
    setError('')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 p-6">
      <h1 className="text-3xl font-bold text-white">POS Bar</h1>

      <p className="text-lg text-slate-300">
        {step === 'codigo' ? 'Ingresa tu código de empleado' : `PIN para el código ${codigo}`}
      </p>

      {/* Visor: el código se muestra, el PIN se enmascara con puntos */}
      <div className="flex h-14 w-full max-w-xs items-center justify-center rounded-xl bg-slate-800 text-3xl tracking-[0.5em] text-white">
        {step === 'codigo' ? value : '•'.repeat(pin.length)}
        {!value && <span className="text-slate-600 tracking-normal text-lg">— — — —</span>}
      </div>

      {error && <p className="font-medium text-red-400">{error}</p>}

      <NumericKeypad
        onDigit={handleDigit}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        submitLabel={loading ? '...' : step === 'codigo' ? 'Sig.' : 'Entrar'}
        disabled={loading}
      />

      {step === 'pin' && (
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-3 text-base font-semibold text-white hover:bg-slate-600"
        >
          <span className="text-2xl leading-none">↩</span>
          Volver (cambiar codigo)
        </button>
      )}
    </main>
  )
}

export default Login
