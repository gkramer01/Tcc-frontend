"use client"

import { useState } from "react"
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google"
import { useNavigate } from "react-router-dom"
import { AuthService } from "../services/AuthService"
import "../styles/AuthPages.css"
import { extractUserInfoFromCredential } from "../utils/googleAuth"

export default function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const user = {
        username: formData.username,
        password: formData.password,
      }

      const response = await AuthService.Login(user)

      if (response.success || response.token) {
        if (response.token) {
          localStorage.setItem("authToken", response.token)
          localStorage.setItem("token", response.token)
        }

        console.log("Login successful:", response)
        navigate("/stores")
      } else {
        setError(response.message || "Login failed. Please check your credentials.")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("An error occurred during login. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError("Google login failed. No credential received.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Extract user info for immediate display (optional)
      const userInfo = extractUserInfoFromCredential(credentialResponse.credential)
      console.log("👤 Google user info extracted:", userInfo)

      const response = await AuthService.GoogleLogin(credentialResponse.credential)

      if (response.success && response.token) {
        // Store the token
        localStorage.setItem("authToken", response.token)
        localStorage.setItem("token", response.token)

        // User info should already be stored by AuthService.GoogleLogin
        // But let's ensure we have it as a fallback
        const storedUser = localStorage.getItem("user")
        if (!storedUser && userInfo) {
          console.log("👤 Storing fallback user info")
          localStorage.setItem("user", JSON.stringify(userInfo))
        }

        console.log("Google login successful:", response)
        navigate("/stores")
      } else {
        setError(response.message || "Google login failed. Please try again.")
      }
    } catch (error) {
      console.error("Google login error:", error)
      setError("An error occurred during Google login. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleFailure = () => {
    console.error("Erro no login com Google")
    setError("Google login failed. Please try again.")
  }

  return (
    <GoogleOAuthProvider clientId="851072462108-1fujt48n2p557sbsi03ltc3drmk1fh2a.apps.googleusercontent.com">
      <div className="auth-page-container">
        <div className="auth-card">
          <h2 className="auth-title">Faça login na sua conta</h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Usuário</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="username"
                required
                disabled={isLoading}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                required
                disabled={isLoading}
                className="form-input"
              />
            </div>

            <button type="submit" disabled={isLoading} className="auth-button">
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="social-login-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleFailure}
              text="signin_with"
              theme="outline"
              shape="rectangular"
              width="100%"
            />
          </div>

          <p className="auth-switch-text">
            Não tem uma conta?{" "}
            <button onClick={() => navigate("/register")} className="auth-switch-link">
              Cadastrar
            </button>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}
