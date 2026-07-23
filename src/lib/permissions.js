// Reglas de permisos por rol. Centralizado para no repetir logica.
// Roles: mesero < cajero < encargado < admin.
//
// NOTA: hoy esto es control de UI (la BD sigue abierta a anon). El
// endurecimiento real (RLS por rol en el servidor) es la fase de seguridad.

const CASH_ROLES = ['cajero', 'encargado', 'admin']

export const isAdmin = (e) => e?.rol === 'admin'

// Operaciones de dinero de caja: base, retiro, gastos, propinas, cuenta DJ.
export const canManageCash = (e) => CASH_ROLES.includes(e?.rol)

// Abrir/cerrar jornada y ver reportes.
export const canCloseCash = (e) => e?.rol === 'encargado' || e?.rol === 'admin'

// Comprar hielo: todos menos mesero.
export const canBuyIce = (e) => e && e.rol !== 'mesero'

// Ver cifras a costo / margenes (solo admin).
export const canSeeCosts = (e) => e?.rol === 'admin'

// Reportes de todos los dias (admin) vs solo los propios (encargado).
export const canSeeAllReports = (e) => e?.rol === 'admin'

// Dar cortesias: admin y encargado siempre; otros solo si el admin les
// habilito el permiso (indefinido o hasta una fecha).
export function canGiveCourtesy(e) {
  if (!e) return false
  if (e.rol === 'admin' || e.rol === 'encargado') return true
  if (e.puede_dar_cortesia) {
    if (!e.cortesia_hasta) return true
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return new Date(e.cortesia_hasta) >= hoy
  }
  return false
}
