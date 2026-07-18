import { createContext, useContext, useState } from 'react'

// Guarda el empleado logueado (id, nombre, codigo, rol) en contexto de React,
// con respaldo en localStorage para sobrevivir recargas de la página.
const EmployeeContext = createContext(null)

const STORAGE_KEY = 'pos-bar:empleado'

export function EmployeeProvider({ children }) {
  const [employee, setEmployee] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY))
    } catch {
      return null
    }
  })

  const login = (emp) => {
    setEmployee(emp)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emp))
  }

  const logout = () => {
    setEmployee(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <EmployeeContext.Provider value={{ employee, login, logout }}>
      {children}
    </EmployeeContext.Provider>
  )
}

export function useEmployee() {
  const ctx = useContext(EmployeeContext)
  if (!ctx) throw new Error('useEmployee debe usarse dentro de <EmployeeProvider>')
  return ctx
}
