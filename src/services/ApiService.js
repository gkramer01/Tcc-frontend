import { AuthService } from "./AuthService"

const API_URL = "https://localhost:7240/api"

// API request with automatic token refresh
export const apiRequest = async (endpoint, options = {}) => {
  // First, ensure we have a valid token
  const isAuthenticated = await AuthService.EnsureValidToken()

  if (!isAuthenticated && options.requiresAuth !== false) {
    throw new Error("Authentication required")
  }

  // Get fresh headers with the current token
  const token = localStorage.getItem("token")
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    // If unauthorized and we have a refresh token, try to refresh and retry
    if (response.status === 401 && localStorage.getItem("refreshToken")) {
      console.log("401 Unauthorized response, attempting token refresh...")
      const refreshed = await AuthService.RefreshToken()

      if (refreshed) {
        // Retry the request with the new token
        const newToken = localStorage.getItem("token")
        const newHeaders = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        }

        return fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: newHeaders,
        })
      } else {
        // If refresh failed, throw error
        console.log("Token refresh failed")
        throw new Error("Sessão expirada. Por favor, faça login novamente.")
      }
    }

    return response
  } catch (error) {
    console.error("API request error:", error)
    throw error
  }
}
