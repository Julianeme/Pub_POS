// Formato de dinero: $25.000 (separador de miles estilo es-CO)
export function money(n) {
  return '$' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 })
}
