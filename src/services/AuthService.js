const API_URL = "https://localhost:7240/api"

function getToken() {
  return localStorage.getItem("token")
}

function getRefreshToken() {
  return localStorage.getItem("refreshToken")
}

function setAuthTokens(token, refreshToken) {
  localStorage.setItem("token", token)
  localStorage.setItem("authToken", token) 

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken)
  }

  if (token) {
    const userInfo = extractUserInfoFromToken(token)
    if (userInfo) {
      localStorage.setItem("user", JSON.stringify(userInfo))

      window.dispatchEvent(new CustomEvent("userDataUpdated"))

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("userDataUpdated"))
      }, 100)

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("userDataUpdated"))
      }, 500)
    }
  }
}

function clearAuthTokens() {
  localStorage.removeItem("token")
  localStorage.removeItem("authToken")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("user")
}

function getAuthHeaders() {
  const token = getToken()
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

async function makeRequest(url, options = {}) {
  const defaultOptions = {
    mode: "cors",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  }

  const requestOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, requestOptions)

    return response
  } catch (error) {
    console.error("❌ Network error:", error)

    // Check if it's a CORS error
    if (error.message.includes("CORS") || error.message.includes("fetch")) {
      console.error("🚫 CORS Error detected. Possible solutions:")
      console.error("1. Check if backend is running on https://localhost:7240")
      console.error("2. Verify CORS configuration on backend")
      console.error("3. Try using HTTP instead of HTTPS for local development")

      // Try HTTP fallback for local development
      if (url.includes("https://localhost")) {
        const httpUrl = url.replace("https://", "http://")

        try {
          const fallbackResponse = await fetch(httpUrl, {
            ...requestOptions,
            mode: "cors",
          })
          return fallbackResponse
        } catch (fallbackError) {
          console.error("❌ HTTP fallback also failed:", fallbackError)
        }
      }
    }

    throw error
  }
}

function extractUserInfoFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))

    const userInfo = {
      id: payload.sub || payload.id || payload.nameid || null,
      name: payload.name || payload.given_name || null,
      userName: payload.preferred_username || payload.unique_name || payload.userName || null,
      email: payload.email || null,
      role: payload.role || payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || null,
      picture: payload.picture || null, 
      aud: payload.aud,
      iss: payload.iss,
      exp: payload.exp,
      iat: payload.iat,
    }

    return userInfo
  } catch (error) {
    console.error("Error extracting user info from token:", error)
    return null
  }
}

export function getCurrentUserFromToken() {
  const token = getToken()
  if (!token) {
    return null
  }

  return extractUserInfoFromToken(token)
}

function isTokenExpired(token) {
  if (!token) return true

  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    const expiry = payload.exp * 1000 // Convert to milliseconds
    const now = Date.now()

    const bufferTime = 2 * 60 * 1000 // 2 minutes in milliseconds
    return now >= expiry - bufferTime
  } catch (error) {
    console.error("Error checking token expiration:", error)
    return true
  }
}

let refreshPromise = null
let refreshInterval = null

export const AuthService = {
  Login: async (user) => {
    try {
      const response = await makeRequest(`${API_URL}/Authentication/login`, {
        method: "POST",
        body: JSON.stringify(user),
      })

      if (response.status === 401) {
        return {
          success: false,
          message: "Credenciais inválidas. Verifique seu usuário e senha.",
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Login failed with status:", response.status, errorText)

        if (response.status === 0 || !response.status) {
          throw new Error("Erro de conexão. Verifique se o servidor está rodando e as configurações de CORS.")
        }

        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.token) {
        setAuthTokens(result.token, result.refreshToken)

        AuthService.startAutoRefresh()

        setTimeout(() => {
          const userInfo = extractUserInfoFromToken(result.token)
          if (userInfo) {
            localStorage.setItem("user", JSON.stringify(userInfo))
            window.dispatchEvent(new CustomEvent("userDataUpdated"))
          }
        }, 200)
      }

      return result
    } catch (error) {
      console.error("❌ Login error:", error)

      // Provide more specific error messages for CORS issues
      if (error.message.includes("CORS") || error.message.includes("fetch") || error.message.includes("NetworkError")) {
        throw new Error(
          "Erro de conexão com o servidor. Verifique se o backend está rodando e configurado corretamente.",
        )
      }

      throw error
    }
  },

  RefreshToken: async () => {
    if (refreshPromise) {
      return refreshPromise
    }

    refreshPromise = (async () => {
      try {
        const refreshToken = getRefreshToken()

        if (!refreshToken) {
          return false
        }
        const response = await makeRequest(`${API_URL}/Authentication/refresh-token`, {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        })

        if (response.status === 401) {
          clearAuthTokens()
          return false
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (result.success && result.token) {
          setAuthTokens(result.token, result.refreshToken)

          AuthService.startAutoRefresh()
          return true
        }

        return false
      } catch (error) {
        console.error("Token refresh error:", error)
        clearAuthTokens()
        return false
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  },

  EnsureValidToken: async () => {
    const token = getToken()

    if (!token) {
      return false
    }

    if (isTokenExpired(token)) {
      return await AuthService.RefreshToken()
    }

    return true
  },

  startAutoRefresh: () => {
    AuthService.stopAutoRefresh()

    const token = getToken()
    if (!token) return

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      const expiry = payload.exp * 1000 // Convert to milliseconds
      const now = Date.now()

      const refreshTime = expiry - now - 5 * 60 * 1000

      if (refreshTime > 0) {
        refreshInterval = setTimeout(async () => {
          const success = await AuthService.RefreshToken()

          if (!success) {
            clearAuthTokens()
          }
        }, refreshTime)
      } else {
        AuthService.RefreshToken()
      }
    } catch (error) {
      console.error("Error setting up auto-refresh:", error)
    }
  },

  stopAutoRefresh: () => {
    if (refreshInterval) {
      clearTimeout(refreshInterval)
      refreshInterval = null
    }
  },

  Logout: async () => {
    try {
      AuthService.stopAutoRefresh()

      const token = getToken()
      const refreshToken = getRefreshToken()

      if (token) {
        const response = await makeRequest(`${API_URL}/Authentication/logout`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ refreshToken }),
        })

        if (!response.ok) {
          console.warn(`Logout HTTP error! status: ${response.status}`)
        }
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      clearAuthTokens()
    }
  },

  Register: async (user) => {
    try {
      const response = await makeRequest(`${API_URL}/Authentication/register`, {
        method: "POST",
        body: JSON.stringify(user),
      })

      if (response.status === 401) {
        return {
          success: false,
          message: "Não autorizado. Verifique suas credenciais.",
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Register error:", error)
      throw error
    }
  },

  GoogleLogin: async (googleCredential) => {
    try {
      const googleLoginData = {
        IdToken: googleCredential,
      }
      const response = await makeRequest(`${API_URL}/Authentication/login/google`, {
        method: "POST",
        body: JSON.stringify(googleLoginData),
      })
      const responseText = await response.text()

      if (!response.ok) {
        console.error("🔐 Google login HTTP error:", response.status, responseText)
        return {
          success: false,
          message: `Erro no servidor: ${response.status}. ${responseText}`,
        }
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ Failed to parse response as JSON:", parseError)
        return {
          success: false,
          message: "Resposta inválida do servidor. Tente novamente.",
        }
      }

      const hasToken = result.token || result.accessToken || result.jwt
      const isSuccess = result.success === true || result.success === "true" || hasToken

      if (isSuccess && hasToken) {
        const token = result.token || result.accessToken || result.jwt

        setAuthTokens(token, result.refreshToken)

        try {
          const { extractUserInfoFromCredential } = await import("../utils/googleAuth")
          const googleUserInfo = extractUserInfoFromCredential(googleCredential)

          const existingUser = JSON.parse(localStorage.getItem("user") || "{}")
          const mergedUserInfo = {
            ...googleUserInfo,
            ...existingUser,
            picture: googleUserInfo?.picture || existingUser.picture,
            email: googleUserInfo?.email || existingUser.email,
          }

          localStorage.setItem("user", JSON.stringify(mergedUserInfo))

          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("userDataUpdated"))
          }, 100)
        } catch (error) {
          console.error("Error merging Google user info:", error)
        }

        // Start auto-refresh mechanism
        AuthService.startAutoRefresh()

        return {
          success: true,
          token: token,
          message: result.message || "Login realizado com sucesso",
        }
      } else {
        return {
          success: false,
          message: result.message || "Login com Google falhou. Tente novamente.",
        }
      }
    } catch (error) {
      console.error("❌ Google login error:", error)
      return {
        success: false,
        message: "Erro durante login com Google. Tente novamente.",
      }
    }
  },
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    const token = getToken()
    if (token) {
      const existingUser = localStorage.getItem("user")
      if (!existingUser) {
        const userInfo = extractUserInfoFromToken(token)
        if (userInfo) {
          localStorage.setItem("user", JSON.stringify(userInfo))
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("userDataUpdated"))
          }, 100)
        }
      }

      if (!isTokenExpired(token)) {
        AuthService.startAutoRefresh()
      } else {
        AuthService.RefreshToken()
      }
    }
  })

  window.addEventListener("beforeunload", () => {
    AuthService.stopAutoRefresh()
  })

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      const token = getToken()
      if (token && isTokenExpired(token)) {
        AuthService.RefreshToken()
      }
    }
  })
}
