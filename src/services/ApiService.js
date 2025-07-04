import { AuthService } from "./AuthService"

const API_URL = "https://localhost:7240/api"

export const apiRequest = async (endpoint, options = {}) => {

  const isAuthenticated = await AuthService.EnsureValidToken()

  if (!isAuthenticated && options.requiresAuth !== false) {
    console.error("❌ Authentication required but no valid token available")
    throw new Error("Authentication required")
  }

  const token = localStorage.getItem("token")
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const requestOptions = {
    mode: "cors",
    credentials: "include",
    ...options,
    headers,
  }

  try {
    let response = await fetch(`${API_URL}${endpoint}`, requestOptions)


    // If we get a CORS error or connection error, try HTTP fallback
    if (!response.ok && response.status === 0) {
      const httpUrl = API_URL.replace("https://", "http://").replace(":7240", ":7240")

      try {
        response = await fetch(`${httpUrl}${endpoint}`, requestOptions)
      } catch (httpError) {
        console.error("❌ HTTP fallback also failed:", httpError)
        throw new Error("Erro de conexão com o servidor. Verifique se o backend está rodando.")
      }
    }

    if (response.status === 401 && localStorage.getItem("refreshToken")) {
      const refreshed = await AuthService.RefreshToken()

      if (refreshed) {
        const newToken = localStorage.getItem("token")
        const newHeaders = {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        }

        return fetch(`${API_URL}${endpoint}`, {
          ...requestOptions,
          headers: newHeaders,
        })
      } else {
        throw new Error("Sessão expirada. Por favor, faça login novamente.")
      }
    }

    return response
  } catch (error) {
    console.error("❌ API request error:", error)

    if (error.message.includes("CORS") || error.message.includes("fetch") || error.name === "TypeError") {
      throw new Error("Erro de conexão com o servidor. Verifique se o backend está rodando e configurado corretamente.")
    }

    throw error
  }
}
