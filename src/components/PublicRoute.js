import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AuthService } from "../services/AuthService"

export default function PublicRoute({ children, redirectTo = "/map" }) {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const checkAuthentication = async () => {
      setIsChecking(true)

      try {
        const token = localStorage.getItem("token")

        if (!token) {
          setShouldRender(true)
          return
        }

        const isValidToken = await AuthService.EnsureValidToken()

        if (isValidToken) {
          navigate(redirectTo, { replace: true })
          return
        } else {
          // Token is invalid, clear it and show public page
          localStorage.removeItem("token")
          localStorage.removeItem("authToken")
          localStorage.removeItem("refreshToken")
          localStorage.removeItem("user")
          setShouldRender(true)
        }
      } catch (error) {
        console.error("🔒 Authentication check failed:", error)
        localStorage.removeItem("token")
        localStorage.removeItem("authToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")
        setShouldRender(true)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuthentication()
  }, [navigate, redirectTo])

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

  return shouldRender ? children : null
}
