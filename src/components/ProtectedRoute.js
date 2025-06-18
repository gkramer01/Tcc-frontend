import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { AuthService } from "../services/AuthService"

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuthentication = async () => {
      setIsChecking(true)

      try {
        const token = localStorage.getItem("token")

        if (!token) {
          console.log("🔒 No token found, redirecting to login")
          navigate("/login", { replace: true })
          return
        }

        // Validate token and refresh if needed
        const isValidToken = await AuthService.EnsureValidToken()

        if (!isValidToken) {
          console.log("🔒 Token validation failed, redirecting to login")
          // Clear invalid tokens
          localStorage.removeItem("token")
          localStorage.removeItem("authToken")
          localStorage.removeItem("refreshToken")
          localStorage.removeItem("user")
          navigate("/login", { replace: true })
          return
        }

        console.log("✅ Authentication successful")
        setIsAuthenticated(true)
      } catch (error) {
        console.error("🔒 Authentication check failed:", error)
        // Clear tokens on error
        localStorage.removeItem("token")
        localStorage.removeItem("authToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")
        navigate("/login", { replace: true })
      } finally {
        setIsChecking(false)
      }
    }

    checkAuthentication()
  }, [navigate, location.pathname])

  if (isChecking) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-content">
          <div className="auth-loading-spinner"></div>
          <span>Verificando autenticação...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return children
}
