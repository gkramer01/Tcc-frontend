const API_URL = "https://localhost:7240/api"

function getToken() {
  return localStorage.getItem("token")
}

function getRefreshToken() {
  return localStorage.getItem("refreshToken")
}

function setAuthTokens(token, refreshToken) {
  localStorage.setItem("token", token)
  localStorage.setItem("authToken", token) // For backward compatibility

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken)
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
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

// Check if token is expired
function isTokenExpired(token) {
  if (!token) return true

  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    const expiry = payload.exp * 1000 // Convert to milliseconds
    return Date.now() > expiry
  } catch (error) {
    console.error("Error checking token expiration:", error)
    return true
  }
}

export const AuthService = {
  Login: async (user) => {
    try {
      const response = await fetch(`${API_URL}/Authentication/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      })

      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        return {
          success: false,
          message: "Credenciais inválidas. Verifique seu usuário e senha.",
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.token) {
        setAuthTokens(result.token, result.refreshToken)
      }

      return result
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  },

  RefreshToken: async () => {
    try {
      const refreshToken = getRefreshToken()

      if (!refreshToken) {
        throw new Error("No refresh token available")
      }

      const response = await fetch(`${API_URL}/Authentication/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (response.status === 401) {
        console.log("Refresh token is invalid or expired")
        clearAuthTokens()
        return false
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.token) {
        setAuthTokens(result.token, result.refreshToken)
        return true
      }

      return false
    } catch (error) {
      console.error("Token refresh error:", error)
      return false
    }
  },

  EnsureValidToken: async () => {
    const token = getToken()

    if (!token || isTokenExpired(token)) {
      console.log("Token expired or not available, attempting refresh...")
      return await AuthService.RefreshToken()
    }

    return true
  },

  Logout: async () => {
    try {
      const token = getToken()
      const refreshToken = getRefreshToken()

      if (token) {
        const response = await fetch(`${API_URL}/Authentication/logout`, {
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
      const response = await fetch(`${API_URL}/Authentication/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        credential: googleCredential,
      }

      const response = await fetch(`${API_URL}/Authentication/login/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleLoginData),
      })

      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        return {
          success: false,
          message: "Não foi possível autenticar com o Google. Tente novamente.",
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.token) {
        setAuthTokens(result.token, result.refreshToken)

        // Store user info
        if (result.user) {
          localStorage.setItem("user", JSON.stringify(result.user))
        }
      }

      return result
    } catch (error) {
      console.error("Google login error:", error)
      throw error
    }
  },
}
