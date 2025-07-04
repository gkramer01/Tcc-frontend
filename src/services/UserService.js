import { apiRequest } from "./ApiService"

function getToken() {
  return localStorage.getItem("token")
}

function getUserIdFromToken() {
  const token = getToken()
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.id || null
  } catch (error) {
    console.error("Error extracting user ID from token:", error)
    return null
  }
}

export const UserService = {
  getCurrentUser: async () => {
    try {
      const userId = getUserIdFromToken()
      if (!userId) {
        throw new Error("User ID not found in token")
      }

      let response
      try {
        response = await apiRequest(`/user/${userId}`, {
          method: "GET",
        })
      } catch (error) {
        response = await apiRequest(`/users/${userId}`, {
          method: "GET",
        })
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const userData = await response.json()
      return userData
    } catch (error) {
      console.error("❌ Error fetching current user:", error)
      throw error
    }
  },

  updateUser: async (updateData) => {
    try {
      const userId = getUserIdFromToken()
      if (!userId) {
        throw new Error("User ID not found in token")
      }

      let response
      try {
        response = await apiRequest(`/Users/${userId}`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        })
      } catch (error) {
        response = await apiRequest(`/users/${userId}`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        })
      }

      if (!response.ok) {
        const errorData = await response.text()
        console.error("User update error:", errorData)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
      const updatedUser = {
        ...currentUser,
        name: updateData.Name, 
        userName: updateData.UserName, 
        email: updateData.Email,
      }
      localStorage.setItem("user", JSON.stringify(updatedUser))

      return result
    } catch (error) {
      console.error("❌ Error updating user:", error)
      throw error
    }
  },

  getById: async (id) => {
    try {
      const response = await apiRequest(`/user/${id}`, {
        method: "GET",
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
      const response = await apiRequest("/Authentication/register", {
        method: "POST",
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

  delete: async (id) => {
    try {
      const response = await apiRequest(`/user/${id}`, {
        method: "DELETE",
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
