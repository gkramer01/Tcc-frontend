import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { AuthService } from "../services/AuthService"
import { LogOut, MapPin, Plus } from "lucide-react"
import "../styles/Header.css"
import UserProfile from "./UserProfile"

export default function Header({ title = "Find.Collect" }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await AuthService.Logout()
      // Clear all stored data
      localStorage.removeItem("authToken")
      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("user")
      navigate("/")
    } catch (error) {
      console.error("Logout error:", error)
      // Even if logout fails, clear local storage and redirect
      localStorage.removeItem("authToken")
      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("user")
      navigate("/")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="header-title">{title}</h1>
        </div>

        <div className="header-center">
          <nav className="nav-links">
            <button
              onClick={() => navigate("/stores")}
              className={`nav-button ${location.pathname === "/stores" ? "active" : ""}`}
              title="Ver Lojas"
            >
              <MapPin size={18} />
              <span>Lojas</span>
            </button>
            <button
              onClick={() => navigate("/map")}
              className={`nav-button ${location.pathname === "/map" ? "active" : ""}`}
              title="Cadastrar Loja"
            >
              <Plus size={18} />
              <span>Cadastrar</span>
            </button>
          </nav>
        </div>

        <div className="header-right">
          <div className="user-section">
            <UserProfile />

            <button onClick={handleLogout} disabled={isLoading} className="logout-button" title="Logout">
              <LogOut size={18} />
              <span className="logout-text">{isLoading ? "Saindo..." : "Sair"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
