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
import Caja from './pages/Caja'
import DjAccount from './pages/DjAccount'
import CashClosing from './pages/CashClosing'
import ReportsScreen from './pages/ReportsScreen'

// Protege una ruta: exige sesión, y opcionalmente uno o varios roles.
function RequireAuth({ children, rol, roles }) {
  const { employee } = useEmployee()
  if (!employee) return <Navigate to="/login" replace />
  const permitidos = roles ?? (rol ? [rol] : null)
  if (permitidos && !permitidos.includes(employee.rol)) return <Navigate to="/" replace />
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
            path="/caja"
            element={
              <RequireAuth>
                <Caja />
              </RequireAuth>
            }
          />
          <Route
            path="/dj"
            element={
              <RequireAuth>
                <DjAccount />
              </RequireAuth>
            }
          />
          <Route
            path="/cierre"
            element={
              <RequireAuth roles={['admin', 'cajero']}>
                <CashClosing />
              </RequireAuth>
            }
          />
          <Route
            path="/reportes"
            element={
              <RequireAuth roles={['admin', 'cajero']}>
                <ReportsScreen />
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
