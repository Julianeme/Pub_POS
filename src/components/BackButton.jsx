import { Link } from 'react-router-dom'

// Boton de retorno grande y facil de tocar en tablet.
function BackButton({ to, label = 'Volver' }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-3 text-base font-semibold text-white hover:bg-slate-600"
    >
      <span className="text-2xl leading-none">↩</span>
      {label}
    </Link>
  )
}

export default BackButton
