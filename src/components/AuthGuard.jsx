"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AuthService } from "../services/AuthService"

export function useAuthGuard() {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true)

      try {
        const token = localStorage.getItem("token")

        if (!token) {
          navigate("/login")
          return
        }

        const validToken = await AuthService.EnsureValidToken()

        if (!validToken) {
          console.log("Token validation failed, redirecting to login")
          navigate("/login")
          return
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error("Auth check error:", error)
        navigate("/login")
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [navigate])

  return { isChecking, isAuthenticated }
}

export default function AuthGuard({ children }) {
  const { isChecking, isAuthenticated } = useAuthGuard()

  if (isChecking) {
    return <div className="auth-loading">Verificando autenticação...</div>
  }

  if (!isAuthenticated) {
    return null // The useEffect will redirect
  }

  return children
}
