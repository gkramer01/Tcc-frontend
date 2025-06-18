"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import { StoreService } from "../services/StoreService"
import { BrandsService } from "../services/BrandService"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

const paymentConditions = [
  { value: 1, label: "Dinheiro", name: "Cash" },
  { value: 2, label: "Cartão de Crédito", name: "CreditCard" },
  { value: 3, label: "Cartão de Débito", name: "DebitCard" },
  { value: 4, label: "Pix", name: "Pix" },
  { value: 5, label: "PayPal", name: "Paypal" },
]

// Component to recenter map based on user location
function LocationFinder({ setUserLocation }) {
  const map = useMap()

  useEffect(() => {
    if ("geolocation" in navigator) {
      console.log("🌍 Getting user location...")
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log(`🌍 User location found: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

          const userLocation = { lat: latitude, lng: longitude }
          setUserLocation(userLocation)
          map.setView([latitude, longitude], 15) // Increased zoom level for better accuracy
        },
        (error) => {
          console.error("🌍 Error getting location:", error.message)
          console.error("🌍 Error code:", error.code)
          // Keep default location (São Paulo)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Increased timeout
          maximumAge: 60000, // Allow cached location up to 1 minute
        },
      )
    } else {
      console.log("🌍 Geolocation not available")
    }
  }, [map, setUserLocation])

  return null
}

function LocationMarker({ onLocationSelect }) {
  const [position, setPosition] = useState(null)

  const googleMapIcon = new L.Icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41],
  })

  useMapEvents({
    click(e) {
      setPosition(e.latlng)
      onLocationSelect(e.latlng)
    },
  })

  return position ? <Marker position={position} icon={googleMapIcon} /> : null
}

export default function MapForm() {
  const [location, setLocation] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    website: "",
    brands: [], // Will store brand IDs now, not names
    paymentConditions: [],
  })
  const [availableBrands, setAvailableBrands] = useState([])
  const [isLoadingBrands, setIsLoadingBrands] = useState(true)
  const [brandsError, setBrandsError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [mapCenter, setMapCenter] = useState([-23.55052, -46.633308]) // Default to São Paulo

  useEffect(() => {
    const fetchBrands = async () => {
      setIsLoadingBrands(true)
      setBrandsError("")

      try {
        console.log("🔄 Starting to fetch brands...")
        const brandsData = await BrandsService.getBrands()

        console.log("📦 Raw brands response:", brandsData)
        console.log("📦 Type of brands response:", typeof brandsData)
        console.log("📦 Is array?", Array.isArray(brandsData))
        console.log("📦 Length:", brandsData?.length)

        if (brandsData) {
          console.log("✅ Setting available brands:", brandsData)
          setAvailableBrands(brandsData)
        } else {
          console.log("❌ No brands data received")
          setBrandsError("Nenhuma marca recebida do servidor")
        }
      } catch (error) {
        console.error("❌ Error fetching brands:", error)
        setBrandsError(`Erro ao carregar marcas: ${error.message}`)
        // Fallback to static brands if API fails
        console.log("🔄 Using fallback brands")
        setAvailableBrands([
          { id: "1", name: "Marca A" },
          { id: "2", name: "Marca B" },
          { id: "3", name: "Marca C" },
          { id: "4", name: "Marca D" },
        ])
      } finally {
        setIsLoadingBrands(false)
        console.log("🏁 Finished loading brands")
      }
    }

    fetchBrands()
  }, [])

  // Update map center when user location is found
  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng])
    }
  }, [userLocation])

  // Debug: Log availableBrands whenever it changes
  useEffect(() => {
    console.log("🎯 Available brands state updated:", availableBrands)
    console.log("🎯 Available brands length:", availableBrands?.length)
  }, [availableBrands])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBrandChange = (e) => {
    const { value, checked } = e.target
    const brandId = value // Now value is the brand ID

    setFormData((prev) => ({
      ...prev,
      brands: checked ? [...prev.brands, brandId] : prev.brands.filter((id) => id !== brandId),
    }))
  }

  const handlePaymentConditionChange = (e) => {
    const { value, checked } = e.target
    const paymentValue = Number.parseInt(value)
    setFormData((prev) => ({
      ...prev,
      paymentConditions: checked
        ? [...prev.paymentConditions, paymentValue]
        : prev.paymentConditions.filter((payment) => payment !== paymentValue),
    }))
  }

  const validateForm = () => {
    if (!location) {
      setError("Selecione um local no mapa primeiro!")
      return false
    }
    if (!formData.name.trim()) {
      setError("Nome da loja é obrigatório!")
      return false
    }
    if (formData.name.length > 100) {
      setError("Nome da loja não pode exceder 100 caracteres!")
      return false
    }
    if (formData.address && formData.address.length > 200) {
      setError("Endereço não pode exceder 200 caracteres!")
      return false
    }
    if (formData.email && !isValidEmail(formData.email)) {
      setError("Email deve ter um formato válido!")
      return false
    }
    if (formData.website && !isValidUrl(formData.website)) {
      setError("Website deve ser uma URL válida!")
      return false
    }
    if (formData.brands.length === 0) {
      setError("Selecione pelo menos uma marca!")
      return false
    }
    if (formData.paymentConditions.length === 0) {
      setError("Selecione pelo menos uma condição de pagamento!")
      return false
    }
    return true
  }

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidUrl = (url) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async () => {
    setError("")
    setSuccess("")

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const storeRequest = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        latitude: location.lat,
        longitude: location.lng,
        brands: formData.brands, // Now sending brand IDs
        paymentConditions: formData.paymentConditions,
      }

      console.log("Sending store request:", storeRequest)
      await StoreService.createStore(storeRequest)
      setSuccess("Loja cadastrada com sucesso!")

      // Reset form
      setFormData({
        name: "",
        address: "",
        email: "",
        website: "",
        brands: [],
        paymentConditions: [],
      })
      setLocation(null)
    } catch (error) {
      console.error("Error saving store:", error)
      setError("Erro ao salvar a loja. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const retryFetchBrands = () => {
    console.log("🔄 Retrying to fetch brands...")
    const fetchBrands = async () => {
      setIsLoadingBrands(true)
      setBrandsError("")

      try {
        const brandsData = await BrandsService.getBrands()
        console.log("🔄 Retry - received brands:", brandsData)
        setAvailableBrands(brandsData)
      } catch (error) {
        console.error("🔄 Retry - error fetching brands:", error)
        setBrandsError(`Erro ao carregar marcas: ${error.message}`)
        setAvailableBrands([
          { id: "1", name: "Marca A" },
          { id: "2", name: "Marca B" },
          { id: "3", name: "Marca C" },
          { id: "4", name: "Marca D" },
        ])
      } finally {
        setIsLoadingBrands(false)
      }
    }

    fetchBrands()
  }

  // Debug render info
  console.log("🎨 Rendering MapForm with:")
  console.log("  - isLoadingBrands:", isLoadingBrands)
  console.log("  - brandsError:", brandsError)
  console.log("  - availableBrands:", availableBrands)
  console.log("  - availableBrands.length:", availableBrands?.length)

  return (
    <div className="map-page-container">
      <div className="map-container">
        <MapContainer center={mapCenter} zoom={13} className="leaflet-container" style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationFinder setUserLocation={setUserLocation} />
          <LocationMarker onLocationSelect={setLocation} />
        </MapContainer>
      </div>

      <div className="form-container">
        <h2>Cadastro de Loja</h2>

        {error && <div className="error-message">{error}</div>}

        {success && <div className="success-message">{success}</div>}

        <div className="form-group">
          <label htmlFor="name">
            Nome da Loja <span className="required">*</span>
          </label>
          <input
            type="text"
            name="name"
            placeholder="Nome da loja"
            value={formData.name}
            onChange={handleInputChange}
            className="input-field"
            disabled={isLoading}
            maxLength={100}
          />
          <small className="field-hint">{formData.name.length}/100 caracteres</small>
        </div>

        <div className="form-group">
          <label htmlFor="address">Endereço</label>
          <input
            type="text"
            name="address"
            placeholder="Endereço da loja"
            value={formData.address}
            onChange={handleInputChange}
            className="input-field"
            disabled={isLoading}
            maxLength={200}
          />
          <small className="field-hint">{formData.address.length}/200 caracteres</small>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            name="email"
            placeholder="email@exemplo.com"
            value={formData.email}
            onChange={handleInputChange}
            className="input-field"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="website">Website</label>
          <input
            type="url"
            name="website"
            placeholder="https://www.exemplo.com"
            value={formData.website}
            onChange={handleInputChange}
            className="input-field"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label>
            Marcas <span className="required">*</span>
          </label>

          {/* Debug info */}
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
            Debug: Loading={isLoadingBrands.toString()}, Error={brandsError || "none"}, Count=
            {availableBrands?.length || 0}
          </div>

          {isLoadingBrands ? (
            <div className="loading-message">Carregando marcas...</div>
          ) : brandsError ? (
            <div className="brands-error">
              <div className="error-message">{brandsError}</div>
              <button type="button" onClick={retryFetchBrands} className="retry-button">
                Tentar Novamente
              </button>
            </div>
          ) : (
            <div className="checkbox-group">
              {availableBrands && availableBrands.length > 0 ? (
                availableBrands.map((brand) => {
                  console.log("🎨 Rendering brand:", brand)
                  return (
                    <label key={brand.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        value={brand.id} // Changed to use brand.id instead of brand.name
                        checked={formData.brands.includes(brand.id)} // Check against brand.id
                        onChange={handleBrandChange}
                        disabled={isLoading}
                      />
                      <span className="checkbox-text">{brand.name}</span>
                    </label>
                  )
                })
              ) : (
                <div className="no-brands-message">
                  Nenhuma marca disponível (Total: {availableBrands?.length || 0})
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>
            Condições de Pagamento <span className="required">*</span>
          </label>
          <div className="checkbox-group">
            {paymentConditions.map((payment) => (
              <label key={payment.value} className="checkbox-label">
                <input
                  type="checkbox"
                  value={payment.value}
                  checked={formData.paymentConditions.includes(payment.value)}
                  onChange={handlePaymentConditionChange}
                  disabled={isLoading}
                />
                <span className="checkbox-text">{payment.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleSubmit} className="submit-button" disabled={isLoading || isLoadingBrands}>
          {isLoading ? "Salvando..." : "Salvar Loja"}
        </button>
      </div>
    </div>
  )
}
