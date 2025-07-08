import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AuthService } from "../services/AuthService"
import "../styles/AuthPages.css"

export default function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem")
      return false
    }
    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const user = {
        username: formData.username,
        password: formData.password,
      }

      await AuthService.Register(user)

      navigate("/login")

    } catch (error) {
      console.error("Registration error:", error)
      setError("An error occurred during registration. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <h2 className="auth-title">Criar nova conta</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Usuário</label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirmar Senha</label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <button type="submit" disabled={isLoading} className="auth-button">
            {isLoading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <p className="auth-switch-text">
          Já tem uma conta?{" "}
          <button onClick={() => navigate("/login")} className="auth-switch-link">
            Fazer login
          </button>
        </p>
      </div>
    </div>
  )
}
