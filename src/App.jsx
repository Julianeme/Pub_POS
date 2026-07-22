import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmployeeProvider, useEmployee } from './context/EmployeeContext'
import Login from './pages/Login'
import FloorMap from './pages/FloorMap'
import AdminEmployees from './pages/AdminEmployees'
import AdminTables from './pages/AdminTables'
import AdminProducts from './pages/AdminProducts'
import AdminCourtesyReasons from './pages/AdminCourtesyReasons'
import AdminPromotions from './pages/AdminPromotions'
import OrderScreen from './pages/OrderScreen'

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
                <FloorMap />
              </RequireAuth>
            }
          />
          <Route
            path="/pedido/:tipo/:id"
            element={
              <RequireAuth>
                <OrderScreen />
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
          <Route
            path="/admin/mesas"
            element={
              <RequireAuth rol="admin">
                <AdminTables />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/productos"
            element={
              <RequireAuth rol="admin">
                <AdminProducts />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/cortesias"
            element={
              <RequireAuth rol="admin">
                <AdminCourtesyReasons />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/promociones"
            element={
              <RequireAuth rol="admin">
                <AdminPromotions />
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
