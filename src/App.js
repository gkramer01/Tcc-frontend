import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import MapPage from "./pages/MapPage"
import RegisterPage from "./pages/RegisterPage"
import StoresMapPage from "./pages/StoresMapPage"
import ProfilePage from "./pages/ProfilePage"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"
import "./styles/AuthGuard.css"

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute redirectTo="/stores">
              <Navigate to="/login" replace />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute redirectTo="/stores">
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute redirectTo="/stores">
              <RegisterPage />
            </PublicRoute>
          }
        />

        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stores"
          element={
            <ProtectedRoute>
              <StoresMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
