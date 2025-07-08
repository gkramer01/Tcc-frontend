import { AuthService } from "./AuthService"
import { connectionManager } from "./ConnectionManager"

// Enhanced API request usando o ConnectionManager
export const apiRequest = async (endpoint, options = {}) => {
  console.log(`🌐 Making API request to: ${endpoint}`)

  // First, ensure we have a valid token
  const isAuthenticated = await AuthService.EnsureValidToken()

  if (!isAuthenticated && options.requiresAuth !== false) {
    console.error("❌ Authentication required but no valid token available")
    throw new Error("Authentication required")
  }

  // Get fresh headers with the current token
  const token = localStorage.getItem("token")
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  console.log("🔑 Request headers:", {
    ...headers,
    Authorization: token ? `Bearer ${token.substring(0, 20)}...` : "No token",
  })

  try {
    const response = await connectionManager.makeRequest(endpoint, {
      ...options,
      headers,
    })

    // Handle authentication responses
    if (response.status === 401 && localStorage.getItem("refreshToken")) {
      console.log("401 Unauthorized response, attempting token refresh...")
      const refreshed = await AuthService.RefreshToken()

      if (refreshed) {
        // Retry the request with the new token
        const newToken = localStorage.getItem("token")
        const newHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        }

        console.log("🔄 Retrying request with refreshed token")
        return connectionManager.makeRequest(endpoint, {
          ...options,
          headers: newHeaders,
        })
      } else {
        throw new Error("Sessão expirada. Por favor, faça login novamente.")
      }
    }

    return response
  } catch (error) {
    console.error("❌ API request error:", error)

    // Provide helpful error messages
    if (error.message.includes("internet")) {
      throw new Error("Sem conexão com a internet. Verifique sua conexão.")
    } else if (error.message.includes("servidor")) {
      throw new Error("Erro de conexão com o servidor. Tente novamente em alguns segundos.")
    }

    throw error
  }
}

// Function to get connection status
export const getConnectionStatus = () => {
  return connectionManager.getConnectionStatus()
}

// Function to force connection test
export const testConnection = () => {
  return connectionManager.testConnection()
}
