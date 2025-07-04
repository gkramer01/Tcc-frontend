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
      const response = await apiRequest("/stores", {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error("❌ Error fetching stores:", error)
      throw error
    }
  },

  searchStores: async (searchTerm) => {
    try {
      const response = await apiRequest(`/stores/search?storeName=${encodeURIComponent(searchTerm)}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error("❌ Error searching stores:", error)
      throw error
    }
  },

  createStore: async (store) => {
    try {
      const currentUser = getCurrentUserFromToken()

      if (!currentUser) {
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      const storeWithUserContext = {
        ...store
      }

      const response = await apiRequest("/stores", {
        method: "POST",
        body: JSON.stringify(storeWithUserContext),
      })

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
      return result
    } catch (error) {
      console.error("❌ Error creating store:", error)
      throw error
    }
  },

  updateStore: async (storeId, storeData) => {
    try {
      const token = getToken()
      if (!token) {
        console.error("❌ No authentication token available for store update")
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      const currentUser = getCurrentUserFromToken()

      if (!currentUser) {
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      const response = await apiRequest(`/stores/${storeId}`, {
        method: "PUT",
        body: JSON.stringify(storeData),
      })

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
      return result
    } catch (error) {
      console.error("❌ Error updating store:", error)
      throw error
    }
  },

  deleteStore: async (storeId) => {
    try {
      const token = getToken()
      if (!token) {
        console.error("❌ No authentication token available for store deletion")
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      const currentUser = getCurrentUserFromToken()

      if (!currentUser) {
        throw new Error("Usuário não autenticado. Faça login novamente.")
      }

      const response = await apiRequest(`/stores/${storeId}`, {
        method: "DELETE",
      })

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

      return true
    } catch (error) {
      console.error("❌ Error deleting store:", error)
      throw error
    }
  },

  getBrands: async () => {
    try {
      const response = await apiRequest("/brands", {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const brands = data.brands || data
      return brands
    } catch (error) {
      console.error("❌ StoreService.getBrands error:", error)
      throw error
    }
  },
}
