"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, MapPin } from "lucide-react"
import { StoreService } from "../services/StoreService"
import "../styles/StoreSearchBar.css"

export default function StoreSearchBar({ onStoreSelect, onClearSearch }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState("")
  const searchRef = useRef(null)
  const resultsRef = useRef(null)

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch(searchTerm.trim())
      } else {
        setSearchResults([])
        setShowResults(false)
        setError("")
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Handle clicks outside to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const performSearch = async (term) => {
    setIsSearching(true)
    setError("")

    try {
      console.log("🔍 Searching for stores:", term)
      const results = await StoreService.searchStores(term)

      console.log("📦 Search results received:", results)
      setSearchResults(Array.isArray(results) ? results : [])
      setShowResults(true)
    } catch (error) {
      console.error("❌ Search error:", error)
      setError("Erro ao buscar lojas. Tente novamente.")
      setSearchResults([])
      setShowResults(true)
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleStoreClick = (store) => {
    console.log("🎯 Store selected:", store)
    setSearchTerm(store.name)
    setShowResults(false)
    if (onStoreSelect) {
      onStoreSelect(store)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm("")
    setSearchResults([])
    setShowResults(false)
    setError("")
    if (onClearSearch) {
      onClearSearch()
    }
  }

  const handleInputFocus = () => {
    if (searchResults.length > 0 || error) {
      setShowResults(true)
    }
  }

  return (
    <div className="store-search-container" ref={searchRef}>
      <div className="search-input-wrapper">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          placeholder="Buscar lojas por nome..."
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="search-input"
        />
        {searchTerm && (
          <button onClick={handleClearSearch} className="clear-search-button" title="Limpar busca">
            <X size={16} />
          </button>
        )}
        {isSearching && <div className="search-loading">Buscando...</div>}
      </div>

      {showResults && (
        <div className="search-results" ref={resultsRef}>
          {error ? (
            <div className="search-error">{error}</div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="search-results-header">
                {searchResults.length} {searchResults.length === 1 ? "loja encontrada" : "lojas encontradas"}
              </div>
              {searchResults.map((store, index) => (
                <div key={store.id || index} className="search-result-item" onClick={() => handleStoreClick(store)}>
                  <div className="search-result-content">
                    <div className="search-result-header">
                      <MapPin size={16} className="search-result-icon" />
                      <span className="search-result-name">{store.name}</span>
                    </div>
                    {store.address && <div className="search-result-address">{store.address}</div>}
                    {store.brands && store.brands.length > 0 && (
                      <div className="search-result-brands">{store.brands.map((brand) => brand.name).join(", ")}</div>
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : searchTerm.trim().length >= 2 ? (
            <div className="search-no-results">Nenhuma loja encontrada para "{searchTerm}"</div>
          ) : (
            <div className="search-hint">Digite pelo menos 2 caracteres para buscar</div>
          )}
        </div>
      )}
    </div>
  )
}
