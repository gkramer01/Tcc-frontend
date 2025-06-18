const API_URL = "https://localhost:7240/api"

function getToken() {
  return localStorage.getItem("token")
}

function getAuthHeaders() {
  const token = getToken()
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export const UserService = {
  getById: async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching user:", error)
      throw error
    }
  },

  create: async (user) => {
    try {
      const response = await fetch(`${API_URL}/Authentication/register`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(user),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error creating user:", error)
      throw error
    }
  },

  update: async (id, user) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(user),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error updating user:", error)
      throw error
    }
  },

  delete: async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      return response.ok
    } catch (error) {
      console.error("Error deleting user:", error)
      throw error
    }
  },

  getUserRole: () => {
    const token = getToken()
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      return payload.role || null
    } catch (error) {
      console.error("Error parsing token:", error)
      return null
    }
  },

  isInRole: (role) => {
    const userRole = UserService.getUserRole()
    return userRole === role
  },
}
