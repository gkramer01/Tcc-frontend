import { apiRequest } from "./ApiService"
import { getCurrentUserFromToken } from "./AuthService"

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

export const StoreService = {
  getStores: async () => {
    try {
      console.log("🌐 Making API call to: /stores")

      const response = await apiRequest("/stores", {
        method: "GET",
      })

      console.log("📡 Response status:", response.status)
      console.log("📡 Response ok:", response.ok)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("📦 Full stores API response:", data)

      // Return the stores array directly
      return data
    } catch (error) {
      console.error("❌ Error fetching stores:", error)
      throw error
    }
  },

  searchStores: async (searchTerm) => {
    try {
      console.log("🔍 Making API call to search stores:", searchTerm)

      const response = await apiRequest(`/stores/search?storeName=${encodeURIComponent(searchTerm)}`, {
        method: "GET",
      })

      console.log("📡 Search response status:", response.status)
      console.log("📡 Search response ok:", response.ok)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("📦 Search results:", data)

      // Return the search results array
      return data
    } catch (error) {
      console.error("❌ Error searching stores:", error)
      throw error
    }
  },

  createStore: async (store) => {
    try {
      console.log("🏪 Creating store with data:", store)

      // Get current user info from token to ensure user context is available
      const currentUser = getCurrentUserFromToken()
      console.log("👤 Current user for store creation:", currentUser)

      if (!currentUser) {
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      // Add user context to the store data if needed by backend
      const storeWithUserContext = {
        ...store,
        // Add any user-specific fields that the backend might need
        // The backend should get user info from the JWT token automatically
      }

      console.log("🏪 Store data with user context:", storeWithUserContext)

      const response = await apiRequest("/stores", {
        method: "POST",
        body: JSON.stringify(storeWithUserContext),
      })

      console.log("📡 Create store response status:", response.status)

      if (!response.ok) {
        const errorData = await response.text()
        console.error("Store creation error:", errorData)

        if (response.status === 401) {
          throw new Error("Sessão expirada. Faça login novamente.")
        } else if (response.status === 403) {
          throw new Error("Você não tem permissão para criar lojas.")
        } else {
          throw new Error(`Erro no servidor: ${response.status}. ${errorData}`)
        }
      }

      const result = await response.json()
      console.log("✅ Store created successfully:", result)
      return result
    } catch (error) {
      console.error("❌ Error creating store:", error)
      throw error
    }
  },

  updateStore: async (storeId, storeData) => {
    try {
      console.log("🔄 Updating store with ID:", storeId)
      console.log("🔄 Update data:", storeData)

      // Verify we have a valid token before making the request
      const token = getToken()
      if (!token) {
        console.error("❌ No authentication token available for store update")
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      // Get current user info from token
      const currentUser = getCurrentUserFromToken()
      console.log("👤 Current user for store update:", currentUser)

      if (!currentUser) {
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      console.log("🔑 Using token for update:", token.substring(0, 20) + "...")

      const response = await apiRequest(`/stores/${storeId}`, {
        method: "PUT",
        body: JSON.stringify(storeData),
      })

      console.log("📡 Update response status:", response.status)
      console.log("📡 Update response ok:", response.ok)

      if (!response.ok) {
        const errorData = await response.text()
        console.error("Store update error response:", errorData)

        if (response.status === 401) {
          throw new Error("Sessão expirada. Faça login novamente.")
        } else if (response.status === 403) {
          throw new Error("Você não tem permissão para editar esta loja.")
        } else {
          throw new Error(`Erro no servidor: ${response.status}. ${errorData}`)
        }
      }

      const result = await response.json()
      console.log("✅ Store updated successfully:", result)
      return result
    } catch (error) {
      console.error("❌ Error updating store:", error)
      throw error
    }
  },

  deleteStore: async (storeId) => {
    try {
      console.log("🗑️ Deleting store with ID:", storeId)

      // Verify we have a valid token before making the request
      const token = getToken()
      if (!token) {
        console.error("❌ No authentication token available for store deletion")
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      // Get current user info from token
      const currentUser = getCurrentUserFromToken()
      console.log("👤 Current user for store deletion:", currentUser)

      if (!currentUser) {
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      console.log("🔑 Using token for deletion:", token.substring(0, 20) + "...")

      const response = await apiRequest(`/stores/${storeId}`, {
        method: "DELETE",
      })

      console.log("📡 Delete response status:", response.status)
      console.log("📡 Delete response ok:", response.ok)

      if (!response.ok) {
        const errorData = await response.text()
        console.error("Store delete error response:", errorData)

        if (response.status === 401) {
          throw new Error("Sessão expirada. Faça login novamente.")
        } else if (response.status === 403) {
          throw new Error("Você não tem permissão para excluir esta loja.")
        } else {
          throw new Error(`Erro no servidor: ${response.status}. ${errorData}`)
        }
      }

      console.log("✅ Store deleted successfully")
      return true
    } catch (error) {
      console.error("❌ Error deleting store:", error)
      throw error
    }
  },

  getBrands: async () => {
    try {
      console.log("🌐 Making API call to: /brands")

      const response = await apiRequest("/brands", {
        method: "GET",
      })

      console.log("📡 Brands response status:", response.status)
      console.log("📡 Brands response ok:", response.ok)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("📦 Full brands API response:", data)

      // Extract brands array from the response: {brands: [...]} or direct array
      const brands = data.brands || data
      console.log("✅ Returning brands:", brands)
      return brands
    } catch (error) {
      console.error("❌ StoreService.getBrands error:", error)
      throw error
    }
  },
}
