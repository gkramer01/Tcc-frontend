"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import { StoreService } from "../services/StoreService"
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
      console.log("🌍 Getting user location with maximum precision...")

      // Multiple attempts with different configurations for better accuracy
      const attemptHighAccuracyLocation = () => {
        const highAccuracyOptions = {
          enableHighAccuracy: true,
          timeout: 45000, // Increased timeout to 45 seconds
          maximumAge: 0, // Always get fresh location
        }

        console.log("🎯 Attempting high accuracy GPS location...")
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords
            console.log(`🌍 High accuracy location: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

            const userLocation = { lat: latitude, lng: longitude }
            setUserLocation(userLocation)

            // Reduced zoom levels by approximately 30%
            let zoomLevel = 14 // Reduced from 19
            if (accuracy <= 10) {
              zoomLevel = 15 // Reduced from 18
            }
            if (accuracy <= 50) {
              zoomLevel = 14 // Reduced from 17
            }
            if (accuracy <= 100) {
              zoomLevel = 13 // Reduced from 16
            }
            if (accuracy > 100) {
              zoomLevel = 12 // Reduced from 15
            }

            console.log(`🎯 Setting zoom level ${zoomLevel} for accuracy ${accuracy}m`)
            map.setView([latitude, longitude], zoomLevel)
          },
          (error) => {
            console.error("🌍 High accuracy location failed:", error.message, "Code:", error.code)

            // Try with medium accuracy settings
            attemptMediumAccuracyLocation()
          },
          highAccuracyOptions,
        )
      }

      const attemptMediumAccuracyLocation = () => {
        const mediumAccuracyOptions = {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 30000, // Allow 30 second old location
        }

        console.log("🎯 Attempting medium accuracy location...")
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords
            console.log(`🌍 Medium accuracy location: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

            const userLocation = { lat: latitude, lng: longitude }
            setUserLocation(userLocation)

            let zoomLevel = 13
            if (accuracy <= 100) {
              zoomLevel = 14
            }
            if (accuracy > 1000) {
              zoomLevel = 11
            }

            map.setView([latitude, longitude], zoomLevel)
          },
          (error) => {
            console.error("🌍 Medium accuracy location failed:", error.message)

            // Final attempt with basic settings
            attemptBasicLocation()
          },
          mediumAccuracyOptions,
        )
      }

      const attemptBasicLocation = () => {
        const basicOptions = {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000, // Allow 5 minute old location
        }

        console.log("🎯 Attempting basic location (network-based)...")
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords
            console.log(`🌍 Basic location: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

            const userLocation = { lat: latitude, lng: longitude }
            setUserLocation(userLocation)

            let zoomLevel = 12
            if (accuracy <= 1000) {
              zoomLevel = 13
            }
            if (accuracy > 5000) {
              zoomLevel = 10
            }

            map.setView([latitude, longitude], zoomLevel)
          },
          (error) => {
            console.error("🌍 All location attempts failed:", error.message)
          },
          basicOptions,
        )
      }

      // Start with the highest accuracy attempt
      attemptHighAccuracyLocation()
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
        const brandsData = await StoreService.getBrands()

        console.log("📦 Raw brands response:", brandsData)

        if (brandsData && Array.isArray(brandsData) && brandsData.length > 0) {
          console.log("✅ Setting available brands:", brandsData)
          setAvailableBrands(brandsData)
        } else {
          console.log("❌ No brands data received")
          setBrandsError("Nenhuma marca disponível no momento")
          setAvailableBrands([])
        }
      } catch (error) {
        console.error("❌ Error fetching brands:", error)
        setBrandsError(`Erro ao carregar marcas: ${error.message}`)
        setAvailableBrands([])
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
        const brandsData = await StoreService.getBrands()
        console.log("🔄 Retry - received brands:", brandsData)

        if (brandsData && Array.isArray(brandsData) && brandsData.length > 0) {
          setAvailableBrands(brandsData)
        } else {
          setBrandsError("Nenhuma marca disponível no momento")
          setAvailableBrands([])
        }
      } catch (error) {
        console.error("🔄 Retry - error fetching brands:", error)
        setBrandsError(`Erro ao carregar marcas: ${error.message}`)
        setAvailableBrands([])
      } finally {
        setIsLoadingBrands(false)
      }
    }

    fetchBrands()
  }

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
                <div className="no-brands-message">Nenhuma marca disponível</div>
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
