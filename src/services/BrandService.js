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

export const BrandsService = {
    getBrands: async () => {
    try {
      const response = await fetch(`${API_URL}/brands`, {
        method: "GET",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const brands = data.brands
      return brands
    } catch (error) {
      console.error("❌ StoreService.getBrands error:", error)
      throw error
    }
  }
}