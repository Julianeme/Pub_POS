import { useState } from 'react'

// Modal de confirmacion reutilizable, con el lenguaje visual de la app
// (tarjeta oscura, icono en circulo, dos botones grandes tactiles).
// tone: 'danger' (rojo, para eliminar) | 'default' (morado).
export function ConfirmModal({
  icon = '⚠️',
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const tones = {
    danger: { ring: 'bg-red-600/20', btn: 'bg-red-600 hover:bg-red-500' },
    default: { ring: 'bg-purple-600/20', btn: 'bg-purple-600 hover:bg-purple-500' },
  }
  const t = tones[tone] ?? tones.danger

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl bg-slate-800 p-6 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-4xl ${t.ring}`}>
          {icon}
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {message && <p className="text-slate-300">{message}</p>}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl bg-slate-700 py-3 text-lg font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-xl py-3 text-lg font-semibold text-white disabled:opacity-50 ${t.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook: confirm(opts) devuelve una promesa true/false; `modal` se renderiza
// en el JSX de la pantalla. Reemplaza a window.confirm con estilo propio.
//
//   const { confirm, confirmModal } = useConfirm()
//   if (!(await confirm({ title: 'Eliminar', message: '...' }))) return
//   ...  {confirmModal}
export function useConfirm() {
  const [state, setState] = useState(null)

  const confirm = (opts) =>
    new Promise((resolve) => setState({ ...opts, resolve }))

  const close = (value) => {
    if (state) state.resolve(value)
    setState(null)
  }

  const confirmModal = state ? (
    <ConfirmModal
      {...state}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null

  return { confirm, confirmModal }
}

export default ConfirmModal
