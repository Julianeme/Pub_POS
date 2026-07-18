// Teclado numérico grande para pantalla táctil.
function NumericKeypad({ onDigit, onDelete, onSubmit, submitLabel = 'OK', disabled = false }) {
  const keyClass =
    'h-16 rounded-xl text-2xl font-semibold select-none transition-colors ' +
    'active:scale-95 disabled:opacity-40'

  return (
    <div className="grid w-full max-w-xs grid-cols-3 gap-3">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(d)}
          className={`${keyClass} bg-slate-700 text-white hover:bg-slate-600`}
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className={`${keyClass} bg-slate-800 text-slate-300 hover:bg-slate-700`}
        aria-label="Borrar"
      >
        ⌫
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit('0')}
        className={`${keyClass} bg-slate-700 text-white hover:bg-slate-600`}
      >
        0
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className={`${keyClass} bg-green-600 text-white hover:bg-green-500`}
      >
        {submitLabel}
      </button>
    </div>
  )
}

export default NumericKeypad
