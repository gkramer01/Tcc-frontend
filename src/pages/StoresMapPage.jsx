"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import { Edit } from "lucide-react"
import Header from "../components/Header"
import StoreUpdateModal from "../components/StoreUpdateModal"
import { StoreService } from "../services/StoreService"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import "../styles/StoresMapPage.css"

// Component to recenter map based on user location
function LocationFinder() {
  const map = useMap()
  const [userLocationFound, setUserLocationFound] = useState(false)

  useEffect(() => {
    if ("geolocation" in navigator && !userLocationFound) {
      console.log("🌍 Getting user location for stores map...")
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log(`🌍 User location found: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

          map.setView([latitude, longitude], 15) // Increased zoom level
          setUserLocationFound(true)
        },
        (error) => {
          console.error("🌍 Error getting location:", error.message)
          console.error("🌍 Error code:", error.code)
          // Keep default location or first store location
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Increased timeout
          maximumAge: 60000, // Allow cached location up to 1 minute
        },
      )
    } else if (!navigator.geolocation) {
      console.log("🌍 Geolocation not available")
    }
  }, [map, userLocationFound])

  return null
}

// Component to add user location marker
function UserLocationMarker() {
  const [position, setPosition] = useState(null)
  const map = useMap()

  const userIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41],
  })

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log(`🌍 User marker location: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)
          setPosition([latitude, longitude])
        },
        (error) => {
          console.error("🌍 Error getting user location marker:", error.message)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      )
    }
  }, [map])

  return position === null ? null : (
    <Marker position={position} icon={userIcon}>
      <Popup>
        <div>
          <strong>Sua localização</strong>
          <p>Você está aqui</p>
        </div>
      </Popup>
    </Marker>
  )
}

export default function StoresMapPage() {
  const [stores, setStores] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [mapCenter, setMapCenter] = useState([-23.55052, -46.633308]) // Default to São Paulo
  const [selectedStore, setSelectedStore] = useState(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)

  // Custom marker icon
  const storeIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41],
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

        // If we have stores, set the map center to the first store
        if (storesData.length > 0) {
          setMapCenter([storesData[0].latitude, storesData[0].longitude])
        }
      } else {
        console.error("❌ Stores data is not an array:", storesData)
        setError("Formato de dados inválido recebido do servidor")
        // Fallback to empty array
        setStores([])
      }
    } catch (error) {
      console.error("❌ Error fetching stores:", error)
      setError("Erro ao carregar as lojas. Tente novamente.")
      // Fallback to empty array
      setStores([])
    } finally {
      setIsLoading(false)
      console.log("🏁 Finished loading stores")
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

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
    // Refresh the stores list
    fetchStores()
  }

  return (
    <div className="stores-map-page">
      <Header title="Lojas - Find.Collect" />

      <div className="stores-map-content">
        <div className="stores-map-header">
          <h1 className="page-title">Lojas Cadastradas</h1>
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
            zoom={13}
            className="leaflet-container"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationFinder />
            <UserLocationMarker />

            {stores.map((store, index) => (
              <Marker key={index} position={[store.latitude, store.longitude]} icon={storeIcon}>
                <Popup>
                  <div className="store-popup">
                    <div className="store-popup-header">
                      <h3 className="store-name">{store.name}</h3>
                      <button onClick={() => handleEditStore(store)} className="edit-store-button" title="Editar loja">
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
            ))}
          </MapContainer>
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
