"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import { Edit, MapPin, Trash2 } from "lucide-react"
import Header from "../components/Header"
import StoreUpdateModal from "../components/StoreUpdateModal"
import DeleteConfirmationModal from "../components/DeleteConfirmationModal"
import StoreSearchBar from "../components/StoreSearchBar"
import { StoreService } from "../services/StoreService"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import "../styles/StoresMapPage.css"

function MapController({ center, zoom }) {
  const map = useMap()

  useEffect(() => {
    if (center) {
      console.log("🎯 Centering map on:", center, "with zoom:", zoom)
      map.setView(center, zoom || 13)
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
      console.log("🌍 Attempting to get user location with maximum precision...")
      setLocationAttempted(true)

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

            const userLocation = [latitude, longitude]

            if (shouldCenter) {
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

              console.log(`🎯 Centering map on user location with zoom ${zoomLevel} (accuracy: ${accuracy}m)`)
              map.setView(userLocation, zoomLevel)
            }

            if (onLocationFound) {
              onLocationFound({ lat: latitude, lng: longitude, accuracy })
            }
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

            const userLocation = [latitude, longitude]

            if (shouldCenter) {
              let zoomLevel = 13
              if (accuracy <= 100) {
                zoomLevel = 14
              }
              if (accuracy > 1000) {
                zoomLevel = 11
              }

              map.setView(userLocation, zoomLevel)
            }

            if (onLocationFound) {
              onLocationFound({ lat: latitude, lng: longitude, accuracy })
            }
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

            const userLocation = [latitude, longitude]

            if (shouldCenter) {
              let zoomLevel = 12
              if (accuracy <= 1000) {
                zoomLevel = 13
              }
              if (accuracy > 5000) {
                zoomLevel = 10
              }

              map.setView(userLocation, zoomLevel)
            }

            if (onLocationFound) {
              onLocationFound({ lat: latitude, lng: longitude, accuracy })
            }
          },
          (error) => {
            console.error("🌍 All location attempts failed:", error.message)

            let errorMessage = "Erro ao obter localização: "
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += "Permissão negada. Permita o acesso à localização nas configurações do navegador."
                break
              case error.POSITION_UNAVAILABLE:
                errorMessage +=
                  "Localização indisponível. Verifique se o GPS está ativado e você está em área com boa cobertura."
                break
              case error.TIMEOUT:
                errorMessage += "Tempo limite excedido. Tente novamente em local com melhor sinal."
                break
              default:
                errorMessage += "Erro desconhecido. Verifique suas configurações de localização."
                break
            }

            if (onLocationFound) {
              onLocationFound(null, errorMessage)
            }
          },
          basicOptions,
        )
      }

      // Start with the highest accuracy attempt
      attemptHighAccuracyLocation()
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

  // Format accuracy for better display
  const formatAccuracy = (accuracy) => {
    if (accuracy < 1000) {
      return `~${Math.round(accuracy)}m`
    } else {
      return `~${(accuracy / 1000).toFixed(1)}km`
    }
  }

  // Get accuracy quality description
  const getAccuracyQuality = (accuracy) => {
    if (accuracy <= 10) return "Excelente"
    if (accuracy <= 50) return "Boa"
    if (accuracy <= 100) return "Média"
    if (accuracy <= 1000) return "Baixa"
    return "Muito baixa"
  }

  return (
    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
      <Popup>
        <div>
          <strong>Sua localização</strong>
          <p>Você está aqui</p>
          {userLocation.accuracy && (
            <div>
              <p>
                <small>
                  Precisão: {formatAccuracy(userLocation.accuracy)} ({getAccuracyQuality(userLocation.accuracy)})
                </small>
              </p>
              {userLocation.accuracy > 1000 && (
                <p>
                  <small style={{ color: "#f39c12" }}>
                    💡 Para melhor precisão, ative o GPS e tente em área aberta
                  </small>
                </p>
              )}
            </div>
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
      title="Centralizar na minha localização"
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
  const [mapZoom, setMapZoom] = useState(11) // Reduced default zoom
  const [selectedStore, setSelectedStore] = useState(null)
  const [storeToDelete, setStoreToDelete] = useState(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
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
        // Reduced zoom levels by approximately 30%
        let zoomLevel = 14 // Reduced from 19
        if (location.accuracy <= 10) {
          zoomLevel = 15 // Reduced from 18
        }
        if (location.accuracy <= 50) {
          zoomLevel = 14 // Reduced from 17
        }
        if (location.accuracy <= 100) {
          zoomLevel = 13 // Reduced from 16
        }
        if (location.accuracy > 100) {
          zoomLevel = 12 // Reduced from 15
        }

        setMapCenter([location.lat, location.lng])
        setMapZoom(zoomLevel)
      }
    } else {
      console.error("📍 Location error:", error)
      setLocationError(error || "Erro ao obter localização")
      setUserLocation(null)
    }
  }

  const handleLocationRequest = () => {
    console.log("🔄 Manual location request with maximum precision")
    setIsGettingLocation(true)
    setLocationError("")
    setShouldCenterOnUser(true)

    if ("geolocation" in navigator) {
      // Multiple attempts for better accuracy
      const attemptHighAccuracyLocation = () => {
        const highAccuracyOptions = {
          enableHighAccuracy: true,
          timeout: 45000, // Increased timeout
          maximumAge: 0, // Always get fresh location
        }

        console.log("🎯 Manual high accuracy GPS location...")
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords
            console.log(`🌍 Manual high accuracy location: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

            const location = { lat: latitude, lng: longitude, accuracy }
            setUserLocation(location)

            // Reduced zoom levels
            let zoomLevel = 14
            if (accuracy <= 10) {
              zoomLevel = 15
            }
            if (accuracy <= 50) {
              zoomLevel = 14
            }
            if (accuracy <= 100) {
              zoomLevel = 13
            }
            if (accuracy > 100) {
              zoomLevel = 12
            }

            setMapCenter([latitude, longitude])
            setMapZoom(zoomLevel)
            setIsGettingLocation(false)
            setLocationError("")
          },
          (error) => {
            console.error("🌍 Manual high accuracy location failed:", error)

            // Fallback attempt with medium accuracy
            const mediumAccuracyOptions = {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 30000,
            }

            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude, accuracy } = position.coords
                console.log(`🌍 Manual medium accuracy location: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

                const location = { lat: latitude, lng: longitude, accuracy }
                setUserLocation(location)
                setMapCenter([latitude, longitude])
                setMapZoom(13)
                setIsGettingLocation(false)
                setLocationError("")
              },
              (fallbackError) => {
                console.error("🌍 Manual medium accuracy location also failed:", fallbackError)
                setIsGettingLocation(false)

                let errorMessage = "Erro ao obter localização: "
                switch (fallbackError.code) {
                  case fallbackError.PERMISSION_DENIED:
                    errorMessage += "Permissão negada. Permita o acesso à localização nas configurações do navegador."
                    break
                  case fallbackError.POSITION_UNAVAILABLE:
                    errorMessage +=
                      "Localização indisponível. Verifique se o GPS está ativado e você está em área aberta."
                    break
                  case fallbackError.TIMEOUT:
                    errorMessage += "Tempo limite excedido. Tente novamente em local com melhor sinal GPS."
                    break
                  default:
                    errorMessage += "Erro desconhecido. Verifique suas configurações de localização."
                    break
                }
                setLocationError(errorMessage)
              },
              mediumAccuracyOptions,
            )
          },
          highAccuracyOptions,
        )
      }

      attemptHighAccuracyLocation()
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
    console.log("🔧 Opening edit modal for store:", store)
    setSelectedStore(store)
    setIsUpdateModalOpen(true)
  }

  const handleDeleteStore = (store) => {
    console.log("🗑️ Opening delete modal for store:", store)
    setStoreToDelete(store)
    setIsDeleteModalOpen(true)
  }

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false)
    setSelectedStore(null)
  }

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setStoreToDelete(null)
  }

  const handleConfirmDelete = async () => {
    if (!storeToDelete) return

    try {
      await StoreService.deleteStore(storeToDelete.id)
      console.log("✅ Store deleted successfully")

      // Refresh the stores list
      await fetchStores()

      // Close the modal
      handleCloseDeleteModal()
    } catch (error) {
      console.error("❌ Error deleting store:", error)
      // You could show an error toast here
      throw error // Re-throw to let the modal handle the error state
    }
  }

  const handleStoreUpdated = () => {
    fetchStores()
  }

  const handleStoreSelect = (store) => {
    console.log("🎯 Store selected from search:", store)
    setShouldCenterOnUser(false) // Don't auto-center on user when selecting a store
    setMapCenter([store.latitude, store.longitude])
    setMapZoom(15) // Reduced from 18
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
      let zoomLevel = 14
      if (userLocation.accuracy <= 10) {
        zoomLevel = 15
      }
      if (userLocation.accuracy <= 50) {
        zoomLevel = 14
      }
      if (userLocation.accuracy <= 100) {
        zoomLevel = 13
      }
      if (userLocation.accuracy > 100) {
        zoomLevel = 12
      }

      setMapCenter([userLocation.lat, userLocation.lng])
      setMapZoom(zoomLevel)
      setShouldCenterOnUser(true)
    } else if (stores.length > 0) {
      setMapCenter([stores[0].latitude, stores[0].longitude])
      setMapZoom(13) // Reduced from 16
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
                        <div className="store-actions">
                          <button
                            onClick={() => handleEditStore(store)}
                            className="edit-store-button"
                            title="Editar loja"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteStore(store)}
                            className="delete-store-button"
                            title="Excluir loja"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
        onClose={handleCloseUpdateModal}
        onUpdate={handleStoreUpdated}
      />

      <DeleteConfirmationModal
        store={storeToDelete}
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
