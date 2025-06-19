import { apiRequest } from "./ApiService"

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
      const response = await apiRequest("/store", {
        method: "POST",
        body: JSON.stringify(store),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error("Store creation error:", errorData)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error creating store:", error)
      throw error
    }
  },
}
