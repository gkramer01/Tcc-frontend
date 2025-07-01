"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Save, ArrowLeft, User, Mail, AtSign, Loader } from "lucide-react"
import Header from "../components/Header"
import { UserService } from "../services/UserService"
import "../styles/ProfilePage.css"

export default function ProfilePage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    Name: "", // Full name
    Email: "",
    UserName: "", // Username
  })
  const [originalData, setOriginalData] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true)
      setError("")

      try {
        // First, try to get data from localStorage (from JWT token)
        const localUserData = localStorage.getItem("user")

        if (localUserData) {
          const parsedUser = JSON.parse(localUserData)
          console.log("👤 Local user data:", parsedUser)

          const userFormData = {
            Name: parsedUser.name || "", // Full name
            Email: parsedUser.email || "",
            UserName: parsedUser.userName || "", // Username
          }

          setFormData(userFormData)
          setOriginalData(userFormData)
          console.log("✅ User data loaded from localStorage:", userFormData)
          setIsLoading(false)
          return
        }

        // If no local data, try to extract from token directly
        const token = localStorage.getItem("token")
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split(".")[1]))
            console.log("🔍 Token payload:", payload)

            const tokenData = {
              Name: payload.name || "", // Full name
              Email: payload.email || "",
              UserName: payload.userName || "", // Username
            }

            setFormData(tokenData)
            setOriginalData(tokenData)
            console.log("✅ User data loaded from token:", tokenData)

            // Store in localStorage for future use
            const userInfo = {
              name: payload.name,
              userName: payload.userName,
              email: payload.email,
              id: payload.id,
              role: payload.role,
            }
            localStorage.setItem("user", JSON.stringify(userInfo))

            setIsLoading(false)
            return
          } catch (tokenError) {
            console.error("❌ Error parsing token:", tokenError)
          }
        }

        // Last resort: try to fetch from backend
        console.log("🔄 Trying to fetch from backend...")
        const userData = await UserService.getCurrentUser()

        const userFormData = {
          Name: userData.name || userData.Name || "",
          Email: userData.email || userData.Email || "",
          UserName: userData.userName || userData.UserName || userData.username || "",
        }

        setFormData(userFormData)
        setOriginalData(userFormData)
        console.log("✅ User data loaded from backend:", userFormData)
      } catch (error) {
        console.error("❌ Error loading user data:", error)
        setError("Erro ao carregar dados do usuário. Tente novamente.")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError("")
    setSuccess("")
  }

  const validateForm = () => {
    if (!formData.Name.trim()) {
      setError("Nome completo é obrigatório!")
      return false
    }
    if (!formData.Email.trim()) {
      setError("Email é obrigatório!")
      return false
    }
    if (!formData.UserName.trim()) {
      setError("Nome de usuário é obrigatório!")
      return false
    }
    if (!isValidEmail(formData.Email)) {
      setError("Email deve ter um formato válido!")
      return false
    }
    if (formData.UserName.length < 3) {
      setError("Nome de usuário deve ter pelo menos 3 caracteres!")
      return false
    }
    return true
  }

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const hasChanges = () => {
    return (
      formData.Name !== originalData.Name ||
      formData.Email !== originalData.Email ||
      formData.UserName !== originalData.UserName
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!validateForm()) {
      return
    }

    if (!hasChanges()) {
      setError("Nenhuma alteração foi feita!")
      return
    }

    setIsSaving(true)

    try {
      console.log("🔄 Updating user with data:", formData)
      await UserService.updateUser(formData)
      setSuccess("Perfil atualizado com sucesso!")
      setOriginalData({ ...formData })

      // Redirect back after a short delay
      setTimeout(() => {
        navigate(-1)
      }, 2000)
    } catch (error) {
      console.error("❌ Error updating user:", error)
      setError("Erro ao atualizar perfil. Tente novamente.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  if (isLoading) {
    return (
      <div className="profile-page">
        <Header title="Perfil - Find.Collect" />
        <div className="profile-page-content">
          <div className="profile-loading">
            <Loader className="loading-spinner" size={32} />
            <span>Carregando dados do usuário...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <Header title="Perfil - Find.Collect" />

      <div className="profile-page-content">
        <div className="profile-container">
          <div className="profile-header">
            <button onClick={handleCancel} className="back-button" title="Voltar">
              <ArrowLeft size={20} />
            </button>
            <h1 className="profile-title">Editar Perfil</h1>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            {error && <div className="profile-error">{error}</div>}
            {success && <div className="profile-success">{success}</div>}

            <div className="form-group">
              <label className="form-label">
                <User size={18} />
                Nome Completo
              </label>
              <input
                type="text"
                name="Name"
                value={formData.Name}
                onChange={handleInputChange}
                className="form-input"
                disabled={isSaving}
                placeholder="Digite seu nome completo"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Mail size={18} />
                Email
              </label>
              <input
                type="email"
                name="Email"
                value={formData.Email}
                onChange={handleInputChange}
                className="form-input"
                disabled={isSaving}
                placeholder="Digite seu email"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <AtSign size={18} />
                Nome de Usuário
              </label>
              <input
                type="text"
                name="UserName"
                value={formData.UserName}
                onChange={handleInputChange}
                className="form-input"
                disabled={isSaving}
                placeholder="Digite seu nome de usuário"
                maxLength={50}
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancel} className="cancel-button" disabled={isSaving}>
                Cancelar
              </button>
              <button type="submit" className="save-button" disabled={isSaving || !hasChanges()}>
                {isSaving ? (
                  <>
                    <Loader size={16} className="spinning" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
