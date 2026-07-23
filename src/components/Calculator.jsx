import { useState } from 'react'

// Calculadora tactil simple con operaciones basicas y parentesis.
function Calculator({ onClose }) {
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('')

  const push = (t) => {
    setResult('')
    setExpr((e) => e + t)
  }
  const clearAll = () => {
    setExpr('')
    setResult('')
  }
  const back = () => setExpr((e) => e.slice(0, -1))

  const evaluar = () => {
    if (!expr) return
    // Solo se permiten digitos, operadores, parentesis y punto
    if (!/^[\d+\-*/().\s]+$/.test(expr)) {
      setResult('Error')
      return
    }
    try {
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${expr})`)()
      if (val == null || Number.isNaN(val) || !Number.isFinite(val)) {
        setResult('Error')
      } else {
        setResult(String(Math.round(val * 100) / 100))
      }
    } catch {
      setResult('Error')
    }
  }

  const keys = [
    ['C', '(', ')', '⌫'],
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
  ]

  const onKey = (k) => {
    if (k === 'C') return clearAll()
    if (k === '⌫') return back()
    if (k === '=') return evaluar()
    push(k)
  }

  const keyClass = (k) => {
    const base = 'h-14 rounded-xl text-xl font-semibold active:scale-95 '
    if (k === '=') return base + 'bg-green-600 text-white hover:bg-green-500'
    if (k === 'C') return base + 'bg-red-900/60 text-red-200 hover:bg-red-800'
    if (['/', '*', '-', '+', '(', ')', '⌫'].includes(k))
      return base + 'bg-slate-600 text-white hover:bg-slate-500'
    return base + 'bg-slate-700 text-white hover:bg-slate-600'
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xs space-y-4 rounded-2xl bg-slate-800 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Calculadora</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
          >
            Cerrar
          </button>
        </div>

        <div className="rounded-xl bg-slate-900 p-3 text-right">
          <p className="min-h-6 break-all text-sm text-slate-400">{expr || '0'}</p>
          <p className="min-h-8 break-all text-2xl font-bold text-white">{result}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {keys.flat().map((k, i) => (
            <button key={i} type="button" onClick={() => onKey(k)} className={keyClass(k)}>
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Calculator
