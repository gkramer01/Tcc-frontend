import { useState, useEffect } from "react"
import { Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { getConnectionStatus, testConnection } from "../services/ApiService"
import "../styles/ConnectionStatus.css"

export default function ConnectionStatus() {
  const [status, setStatus] = useState(getConnectionStatus())
  const [isVisible, setIsVisible] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    const handleConnectionChange = (event) => {
      const newStatus = event.detail
      setStatus(newStatus)

      // Mostra o indicador por alguns segundos quando há mudança
      setIsVisible(true)
      setTimeout(() => setIsVisible(false), 5000)
    }

    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }))
      setIsVisible(true)
      setTimeout(() => setIsVisible(false), 3000)
    }

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false, status: "offline" }))
      setIsVisible(true)
    }

    window.addEventListener("connectionStatusChanged", handleConnectionChange)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Mostra inicialmente se há problemas
    if (status.status !== "connected" || status.failures > 0) {
      setIsVisible(true)
    }

    return () => {
      window.removeEventListener("connectionStatusChanged", handleConnectionChange)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [status.status, status.failures])

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      await testConnection()
    } finally {
      setIsTesting(false)
    }
  }

  const getStatusInfo = () => {
    if (!status.isOnline) {
      return {
        icon: WifiOff,
        text: "Sem Internet",
        className: "offline",
        color: "#e74c3c",
      }
    }

    switch (status.status) {
      case "connected":
        return {
          icon: CheckCircle,
          text: "Conectado",
          className: "connected",
          color: "#2ecc71",
        }
      case "failed":
        return {
          icon: AlertTriangle,
          text: `Erro de Conexão (${status.failures} falhas)`,
          className: "failed",
          color: "#e74c3c",
        }
      default:
        return {
          icon: Wifi,
          text: "Verificando...",
          className: "checking",
          color: "#f39c12",
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  if (!isVisible && status.status === "connected" && status.failures === 0) {
    return null
  }

  return (
    <div className={`connection-status ${statusInfo.className} ${isVisible ? "visible" : ""}`}>
      <div className="connection-content">
        <StatusIcon size={16} style={{ color: statusInfo.color }} />
        <span className="connection-text">{statusInfo.text}</span>

        {status.status === "failed" && (
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="retry-button"
            title="Tentar reconectar"
          >
            <RefreshCw size={14} className={isTesting ? "spinning" : ""} />
          </button>
        )}
      </div>

      {status.url && status.status === "connected" && (
        <div className="connection-details">Conectado via: {status.url.replace("/api", "")}</div>
      )}
    </div>
  )
}
