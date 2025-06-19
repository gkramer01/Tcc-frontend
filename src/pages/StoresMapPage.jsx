"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import { Edit, MapPin } from "lucide-react"
import Header from "../components/Header"
import StoreUpdateModal from "../components/StoreUpdateModal"
import StoreSearchBar from "../components/StoreSearchBar"
import { StoreService } from "../services/StoreService"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import "../styles/StoresMapPage.css"

// Component to handle map centering
function MapController({ center, zoom }) {
  const map = useMap()

  useEffect(() => {
    if (center) {
      console.log("🎯 Centering map on:", center, "with zoom:", zoom)
      map.setView(center, zoom || 16)
    }
  }, [map, center, zoom])

  return null
}

// Component to get user location and center map
function UserLocationFinder({ onLocationFound, shouldCenter = true }) {
  const map = useMap()
  const [locationAttempted, setLocationAttempted] = useState(false)

  useEffect(() => {
    if ("geolocation" in navigator && !locationAttempted) {
      console.log("🌍 Attempting to get user location...")
      setLocationAttempted(true)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log(`🌍 User location found: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

          const userLocation = [latitude, longitude]

          if (shouldCenter) {
            console.log("🎯 Centering map on user location")
            map.setView(userLocation, 15)
          }

          if (onLocationFound) {
            onLocationFound({ lat: latitude, lng: longitude, accuracy })
          }
        },
        (error) => {
          console.error("🌍 Error getting location:", error.message)
          console.error("🌍 Error code:", error.code)

          let errorMessage = "Erro ao obter localização: "
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += "Permissão negada pelo usuário"
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage += "Localização indisponível"
              break
            case error.TIMEOUT:
              errorMessage += "Tempo limite excedido"
              break
            default:
              errorMessage += "Erro desconhecido"
              break
          }
          console.error(errorMessage)

          if (onLocationFound) {
            onLocationFound(null, errorMessage)
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // 15 seconds timeout
          maximumAge: 300000, // 5 minutes cache
        },
      )
    } else if (!navigator.geolocation) {
      console.log("🌍 Geolocation not available in this browser")
      if (onLocationFound) {
        onLocationFound(null, "Geolocalização não disponível neste navegador")
      }
    }
  }, [map, onLocationFound, shouldCenter, locationAttempted])

  return null
}

// Component to add user location marker
function UserLocationMarker({ userLocation }) {
  const userIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41],
  })

  if (!userLocation) return null

  return (
    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
      <Popup>
        <div>
          <strong>Sua localização</strong>
          <p>Você está aqui</p>
          {userLocation.accuracy && (
            <p>
              <small>Precisão: ~{Math.round(userLocation.accuracy)}m</small>
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

// Component for location control button
function LocationButton({ onLocationRequest, isLoading }) {
  return (
    <button
      className="location-control-button"
      onClick={onLocationRequest}
      disabled={isLoading}
      title="Centralizar no minha localização"
    >
      <MapPin size={20} />
      {isLoading && <div className="location-loading-spinner"></div>}
    </button>
  )
}

export default function StoresMapPage() {
  const [stores, setStores] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [mapCenter, setMapCenter] = useState([-23.55052, -46.633308]) // Default to São Paulo
  const [mapZoom, setMapZoom] = useState(13)
  const [selectedStore, setSelectedStore] = useState(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [highlightedStore, setHighlightedStore] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState("")
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [shouldCenterOnUser, setShouldCenterOnUser] = useState(true)

  // Custom marker icons
  const storeIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41],
  })

  const highlightedStoreIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    iconSize: [30, 49],
    iconAnchor: [15, 49],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [49, 49],
  })

  const fetchStores = async () => {
    setIsLoading(true)
    setError("")

    try {
      console.log("🔄 Fetching stores...")
      const storesData = await StoreService.getStores()
      console.log("📦 Stores data received:", storesData)

      if (Array.isArray(storesData)) {
        setStores(storesData)

        // Only set map center to first store if we don't have user location
        if (storesData.length > 0 && !userLocation && !shouldCenterOnUser) {
          setMapCenter([storesData[0].latitude, storesData[0].longitude])
        }
      } else {
        console.error("❌ Stores data is not an array:", storesData)
        setError("Formato de dados inválido recebido do servidor")
        setStores([])
      }
    } catch (error) {
      console.error("❌ Error fetching stores:", error)
      setError("Erro ao carregar as lojas. Tente novamente.")
      setStores([])
    } finally {
      setIsLoading(false)
      console.log("🏁 Finished loading stores")
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

  const handleLocationFound = (location, error) => {
    setIsGettingLocation(false)

    if (location) {
      console.log("📍 Location found:", location)
      setUserLocation(location)
      setLocationError("")

      if (shouldCenterOnUser) {
        setMapCenter([location.lat, location.lng])
        setMapZoom(15)
      }
    } else {
      console.error("📍 Location error:", error)
      setLocationError(error || "Erro ao obter localização")
      setUserLocation(null)
    }
  }

  const handleLocationRequest = () => {
    console.log("🔄 Manual location request")
    setIsGettingLocation(true)
    setLocationError("")
    setShouldCenterOnUser(true)

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log(`🌍 Manual location found: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

          const location = { lat: latitude, lng: longitude, accuracy }
          setUserLocation(location)
          setMapCenter([latitude, longitude])
          setMapZoom(15)
          setIsGettingLocation(false)
          setLocationError("")
        },
        (error) => {
          console.error("🌍 Manual location error:", error)
          setIsGettingLocation(false)

          let errorMessage = "Erro ao obter localização: "
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += "Permissão negada. Permita o acesso à localização nas configurações do navegador."
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage += "Localização indisponível. Verifique se o GPS está ativado."
              break
            case error.TIMEOUT:
              errorMessage += "Tempo limite excedido. Tente novamente."
              break
            default:
              errorMessage += "Erro desconhecido"
              break
          }
          setLocationError(errorMessage)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000, // 1 minute cache
        },
      )
    } else {
      setLocationError("Geolocalização não disponível neste navegador")
      setIsGettingLocation(false)
    }
  }

  // Format brands list for display
  const formatBrands = (brands) => {
    if (!brands || !Array.isArray(brands) || brands.length === 0) {
      return "Nenhuma marca informada"
    }
    return brands.map((brand) => brand.name).join(", ")
  }

  const handleEditStore = (store) => {
    setSelectedStore(store)
    setIsUpdateModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsUpdateModalOpen(false)
    setSelectedStore(null)
  }

  const handleStoreUpdated = () => {
    fetchStores()
  }

  const handleStoreSelect = (store) => {
    console.log("🎯 Store selected from search:", store)
    setShouldCenterOnUser(false) // Don't auto-center on user when selecting a store
    setMapCenter([store.latitude, store.longitude])
    setMapZoom(16)
    setHighlightedStore(store.id || store.name)

    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedStore(null)
    }, 3000)
  }

  const handleClearSearch = () => {
    setHighlightedStore(null)
    // Reset to user location if available, otherwise first store
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng])
      setMapZoom(15)
      setShouldCenterOnUser(true)
    } else if (stores.length > 0) {
      setMapCenter([stores[0].latitude, stores[0].longitude])
      setMapZoom(13)
    }
  }

  return (
    <div className="stores-map-page">
      <Header title="Lojas - Find.Collect" />

      <div className="stores-map-content">
        <div className="stores-map-header">
          <h1 className="page-title">Lojas Cadastradas</h1>

          <div className="search-section">
            <StoreSearchBar onStoreSelect={handleStoreSelect} onClearSearch={handleClearSearch} />
          </div>

          {locationError && (
            <div className="location-error">
              {locationError}
              <button onClick={handleLocationRequest} className="retry-location-button">
                Tentar Novamente
              </button>
            </div>
          )}

          {isLoading && <div className="loading-message">Carregando lojas...</div>}
          {error && <div className="error-message">{error}</div>}
          {!isLoading && !error && (
            <div className="stores-count">
              {stores.length} {stores.length === 1 ? "loja encontrada" : "lojas encontradas"}
            </div>
          )}
        </div>

        <div className="map-container-full">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="leaflet-container"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <UserLocationFinder onLocationFound={handleLocationFound} shouldCenter={shouldCenterOnUser} />

            <UserLocationMarker userLocation={userLocation} />

            <MapController center={mapCenter} zoom={mapZoom} />

            {stores.map((store, index) => {
              const isHighlighted = highlightedStore === store.id || highlightedStore === store.name
              return (
                <Marker
                  key={index}
                  position={[store.latitude, store.longitude]}
                  icon={isHighlighted ? highlightedStoreIcon : storeIcon}
                >
                  <Popup>
                    <div className="store-popup">
                      <div className="store-popup-header">
                        <h3 className="store-name">{store.name}</h3>
                        <button
                          onClick={() => handleEditStore(store)}
                          className="edit-store-button"
                          title="Editar loja"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                      <div className="store-details">
                        {store.address && (
                          <p>
                            <strong>Endereço:</strong> {store.address}
                          </p>
                        )}
                        {store.email && (
                          <p>
                            <strong>Email:</strong> {store.email}
                          </p>
                        )}
                        {store.website && (
                          <p>
                            <strong>Website:</strong>{" "}
                            <a href={store.website} target="_blank" rel="noopener noreferrer">
                              {store.website}
                            </a>
                          </p>
                        )}
                        <p>
                          <strong>Marcas:</strong> {formatBrands(store.brands)}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          <LocationButton onLocationRequest={handleLocationRequest} isLoading={isGettingLocation} />
        </div>
      </div>

      <StoreUpdateModal
        store={selectedStore}
        isOpen={isUpdateModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleStoreUpdated}
      />
    </div>
  )
}
