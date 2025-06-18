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
      console.log("🌐 Making API call to:", `${API_URL}/brands`)
      console.log("🔑 Using headers:", getAuthHeaders())

      const response = await fetch(`${API_URL}/brands`, {
        method: "GET",
        headers: getAuthHeaders(),
      })

      console.log("📡 Response status:", response.status)
      console.log("📡 Response ok:", response.ok)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("📦 Full API response:", data)
      console.log("📦 data.brands:", data.brands)
      console.log("📦 Type of data.brands:", typeof data.brands)
      console.log("📦 Is data.brands array?", Array.isArray(data.brands))

      // Extract brands array from the response: {brands: [...]}
      const brands = data.brands
      console.log("✅ Returning brands:", brands)
      return brands
    } catch (error) {
      console.error("❌ StoreService.getBrands error:", error)
      throw error
    }
  }
}