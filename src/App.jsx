import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmployeeProvider, useEmployee } from './context/EmployeeContext'
import Login from './pages/Login'
import Home from './pages/Home'
import AdminEmployees from './pages/AdminEmployees'

// Protege una ruta: exige sesión, y opcionalmente un rol específico.
function RequireAuth({ children, rol }) {
  const { employee } = useEmployee()
  if (!employee) return <Navigate to="/login" replace />
  if (rol && employee.rol !== rol) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <EmployeeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/empleados"
            element={
              <RequireAuth rol="admin">
                <AdminEmployees />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </EmployeeProvider>
  )
}

export default App
