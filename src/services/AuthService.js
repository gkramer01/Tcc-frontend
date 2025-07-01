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

  // Extract user info from JWT token and store it
  if (token) {
    const userInfo = extractUserInfoFromToken(token)
    if (userInfo) {
      localStorage.setItem("user", JSON.stringify(userInfo))
      console.log("👤 User info extracted and stored from token:", userInfo)

      // Force update of user profile component with multiple attempts
      // Immediate dispatch
      window.dispatchEvent(new CustomEvent("userDataUpdated"))
      console.log("📡 userDataUpdated event dispatched immediately")

      // Delayed dispatch to ensure components are ready
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("userDataUpdated"))
        console.log("📡 userDataUpdated event dispatched after 100ms")
      }, 100)

      // Additional dispatch after a longer delay as fallback
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("userDataUpdated"))
        console.log("📡 userDataUpdated event dispatched after 500ms (fallback)")
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
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

// Extract user information from JWT token - UPDATED to extract role and other claims
function extractUserInfoFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    console.log("🔍 Full JWT payload:", payload)

    // Extract user info from JWT claims
    const userInfo = {
      id: payload.sub || payload.id || payload.nameid || null,
      name: payload.name || payload.given_name || null,
      userName: payload.preferred_username || payload.unique_name || payload.userName || null,
      email: payload.email || null,
      role: payload.role || payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || null,
      picture: payload.picture || null, // For Google login
      // Add other common JWT claims
      aud: payload.aud,
      iss: payload.iss,
      exp: payload.exp,
      iat: payload.iat,
    }

    console.log("👤 Extracted user info:", userInfo)
    return userInfo
  } catch (error) {
    console.error("Error extracting user info from token:", error)
    return null
  }
}

// Get current user info from token
export function getCurrentUserFromToken() {
  const token = getToken()
  if (!token) {
    console.log("🔍 No token available for user extraction")
    return null
  }

  return extractUserInfoFromToken(token)
}

// Check if token is expired
function isTokenExpired(token) {
  if (!token) return true

  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    const expiry = payload.exp * 1000 // Convert to milliseconds
    const now = Date.now()

    // Consider token expired if it expires within the next 2 minutes
    const bufferTime = 2 * 60 * 1000 // 2 minutes in milliseconds
    return now >= expiry - bufferTime
  } catch (error) {
    console.error("Error checking token expiration:", error)
    return true
  }
}

// Auto-refresh token mechanism
let refreshPromise = null
let refreshInterval = null

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
      console.log("🔐 Login response:", result)

      if (result.success && result.token) {
        setAuthTokens(result.token, result.refreshToken)

        // Start auto-refresh mechanism
        AuthService.startAutoRefresh()

        // Additional user data update after login success
        setTimeout(() => {
          const userInfo = extractUserInfoFromToken(result.token)
          if (userInfo) {
            localStorage.setItem("user", JSON.stringify(userInfo))
            window.dispatchEvent(new CustomEvent("userDataUpdated"))
            console.log("📡 Additional userDataUpdated event after login success")
          }
        }, 200)

        console.log("✅ Login successful, user data should be loaded")
      }

      return result
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  },

  RefreshToken: async () => {
    // Prevent multiple simultaneous refresh requests
    if (refreshPromise) {
      return refreshPromise
    }

    refreshPromise = (async () => {
      try {
        const refreshToken = getRefreshToken()

        if (!refreshToken) {
          console.log("No refresh token available")
          return false
        }

        console.log("🔄 Refreshing token...")

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
          console.log("✅ Token refreshed successfully")
          setAuthTokens(result.token, result.refreshToken)

          // Restart auto-refresh with new token
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
      console.log("Token expired, attempting refresh...")
      return await AuthService.RefreshToken()
    }

    return true
  },

  // Auto-refresh mechanism - schedules refresh before token expires
  startAutoRefresh: () => {
    // Clear any existing interval
    AuthService.stopAutoRefresh()

    const token = getToken()
    if (!token) return

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      const expiry = payload.exp * 1000 // Convert to milliseconds
      const now = Date.now()

      // Schedule refresh 5 minutes before expiry
      const refreshTime = expiry - now - 5 * 60 * 1000

      if (refreshTime > 0) {
        console.log(`🕐 Auto-refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`)

        refreshInterval = setTimeout(async () => {
          console.log("🔄 Auto-refreshing token...")
          const success = await AuthService.RefreshToken()

          if (!success) {
            console.log("Auto-refresh failed")
            // Don't redirect automatically, just clear tokens
            clearAuthTokens()
          }
        }, refreshTime)
      } else {
        // Token expires soon, refresh immediately
        console.log("Token expires soon, refreshing immediately...")
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
      console.log("Auto-refresh stopped")
    }
  },

  Logout: async () => {
    try {
      // Stop auto-refresh
      AuthService.stopAutoRefresh()

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
      // Send IdToken as string
      const googleLoginData = {
        IdToken: googleCredential,
      }

      console.log("🔐 Sending Google login request...")

      const response = await fetch(`${API_URL}/Authentication/login/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleLoginData),
      })

      console.log("📡 Google login response status:", response.status)

      // Get response text first to see what we're dealing with
      const responseText = await response.text()
      console.log("📄 Raw response text:", responseText)

      if (!response.ok) {
        console.error("🔐 Google login HTTP error:", response.status, responseText)
        return {
          success: false,
          message: `Erro no servidor: ${response.status}. ${responseText}`,
        }
      }

      // Try to parse as JSON
      let result
      try {
        result = JSON.parse(responseText)
        console.log("📦 Parsed Google login response:", result)
      } catch (parseError) {
        console.error("❌ Failed to parse response as JSON:", parseError)
        return {
          success: false,
          message: "Resposta inválida do servidor. Tente novamente.",
        }
      }

      // Check for different possible response formats
      const hasToken = result.token || result.accessToken || result.jwt
      const isSuccess = result.success === true || result.success === "true" || hasToken

      if (isSuccess && hasToken) {
        const token = result.token || result.accessToken || result.jwt
        console.log("✅ Google login successful with token")

        setAuthTokens(token, result.refreshToken)

        // For Google login, merge with Google credential info
        try {
          const { extractUserInfoFromCredential } = await import("../utils/googleAuth")
          const googleUserInfo = extractUserInfoFromCredential(googleCredential)

          // Merge JWT info with Google info, prioritizing JWT
          const existingUser = JSON.parse(localStorage.getItem("user") || "{}")
          const mergedUserInfo = {
            ...googleUserInfo,
            ...existingUser,
            // Keep Google-specific fields
            picture: googleUserInfo?.picture || existingUser.picture,
            email: googleUserInfo?.email || existingUser.email,
          }

          localStorage.setItem("user", JSON.stringify(mergedUserInfo))
          console.log("👤 Merged user info for Google login:", mergedUserInfo)

          // Force update of user profile component
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("userDataUpdated"))
            console.log("📡 userDataUpdated event dispatched for Google login")
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
        console.log("❌ Google login failed - no token or success flag")
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

// Initialize auto-refresh on page load if user is already logged in
if (typeof window !== "undefined") {
  // Check for existing valid session on page load
  window.addEventListener("load", () => {
    const token = getToken()
    if (token) {
      // Re-extract user info from existing token in case it's missing
      const existingUser = localStorage.getItem("user")
      if (!existingUser) {
        const userInfo = extractUserInfoFromToken(token)
        if (userInfo) {
          localStorage.setItem("user", JSON.stringify(userInfo))
          console.log("👤 Re-extracted user info on page load:", userInfo)
          // Dispatch event to update UI
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("userDataUpdated"))
          }, 100)
        }
      }

      if (!isTokenExpired(token)) {
        console.log("🔄 Resuming auto-refresh on page load")
        AuthService.startAutoRefresh()
      } else {
        console.log("🔄 Token expired on page load, attempting refresh...")
        AuthService.RefreshToken()
      }
    }
  })

  // Stop auto-refresh when page is about to unload
  window.addEventListener("beforeunload", () => {
    AuthService.stopAutoRefresh()
  })

  // Handle page visibility changes (user switches tabs)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      // Page became visible, check if token needs refresh
      const token = getToken()
      if (token && isTokenExpired(token)) {
        console.log("🔄 Page visible and token expired, refreshing...")
        AuthService.RefreshToken()
      }
    }
  })
}
