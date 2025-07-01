"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { User } from "lucide-react"

export default function UserProfile({ className = "" }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)
  const lastUpdateRef = useRef(0)

  const loadUserData = () => {
    console.log("👤 Loading user data...")
    const userData = localStorage.getItem("user")
    const currentTime = Date.now()

    // Prevent too frequent updates
    if (currentTime - lastUpdateRef.current < 50) {
      console.log("👤 Skipping user data load - too frequent")
      return
    }

    lastUpdateRef.current = currentTime

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData)
        console.log("👤 User data loaded:", parsedUser)
        if (mountedRef.current) {
          setUser(parsedUser)
          setImageError(false) // Reset image error when user changes
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error parsing user data:", error)
        if (mountedRef.current) {
          setUser(null)
          setIsLoading(false)
        }
      }
    } else {
      console.log("👤 No user data found in localStorage, trying to extract from token...")

      // Try to extract from token if no user data in localStorage
      const token = localStorage.getItem("token")
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]))
          console.log("👤 Extracting user data from token:", payload)

          const userInfo = {
            id: payload.sub || payload.id || payload.nameid || null,
            name: payload.name || payload.given_name || null,
            userName: payload.preferred_username || payload.unique_name || payload.userName || null,
            email: payload.email || null,
            role: payload.role || payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || null,
            picture: payload.picture || null,
          }

          if (userInfo.name || userInfo.userName || userInfo.email) {
            console.log("👤 User info extracted from token:", userInfo)
            localStorage.setItem("user", JSON.stringify(userInfo))
            if (mountedRef.current) {
              setUser(userInfo)
              setImageError(false)
              setIsLoading(false)
            }
          } else {
            console.log("👤 No valid user info found in token")
            if (mountedRef.current) {
              setUser(null)
              setIsLoading(false)
            }
          }
        } catch (error) {
          console.error("👤 Error extracting user data from token:", error)
          if (mountedRef.current) {
            setUser(null)
            setIsLoading(false)
          }
        }
      } else {
        console.log("👤 No token found")
        if (mountedRef.current) {
          setUser(null)
          setIsLoading(false)
        }
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true

    // Load user data immediately on component mount
    loadUserData()

    // Listen for user data updates (after login)
    const handleUserDataUpdate = () => {
      console.log("👤 User data updated event received")
      if (mountedRef.current) {
        // Small delay to ensure localStorage is updated
        setTimeout(() => {
          loadUserData()
        }, 50)
      }
    }

    // Listen for storage changes (in case user data is updated in another tab)
    const handleStorageChange = (e) => {
      if ((e.key === "user" || e.key === "token") && mountedRef.current) {
        console.log("👤 User data or token changed in storage")
        setTimeout(() => {
          loadUserData()
        }, 50)
      }
    }

    // Listen for focus events (when user returns to tab)
    const handleFocus = () => {
      if (mountedRef.current) {
        console.log("👤 Window focused, checking for user data updates")
        loadUserData()
      }
    }

    window.addEventListener("userDataUpdated", handleUserDataUpdate)
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", handleFocus)

    // Periodic check for user data (fallback mechanism)
    const intervalId = setInterval(() => {
      if (mountedRef.current && !user) {
        console.log("👤 Periodic check for user data")
        loadUserData()
      }
    }, 2000) // Check every 2 seconds if no user data

    // Cleanup event listeners and interval
    return () => {
      mountedRef.current = false
      window.removeEventListener("userDataUpdated", handleUserDataUpdate)
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", handleFocus)
      clearInterval(intervalId)
    }
  }, [user])

  const handleImageError = () => {
    console.log("🖼️ User image failed to load, showing fallback icon")
    if (mountedRef.current) {
      setImageError(true)
    }
  }

  const handleImageLoad = () => {
    console.log("🖼️ User image loaded successfully")
    if (mountedRef.current) {
      setImageError(false)
    }
  }

  const handleAvatarClick = () => {
    navigate("/profile")
  }

  // Show loading state briefly
  if (isLoading) {
    return (
      <div className={`avatar-container ${className}`} style={{ cursor: "pointer" }}>
        <User className="avatar-icon" size={24} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`avatar-container ${className}`} onClick={handleAvatarClick} style={{ cursor: "pointer" }}>
        <User className="avatar-icon" size={24} />
      </div>
    )
  }

  return (
    <div className={`user-profile ${className}`}>
      <div style={{ cursor: "pointer" }} onClick={handleAvatarClick}>
        {user.picture && !imageError ? (
          <img
            src={user.picture || "/placeholder.svg"}
            alt={user.userName || user.name || "User"}
            className="user-avatar-image"
            onError={handleImageError}
            onLoad={handleImageLoad}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="avatar-container">
            <User className="avatar-icon" size={24} />
          </div>
        )}
      </div>

      <div className="user-info">
        <span className="user-name">
          {user.userName && user.userName !== "string" ? user.userName : user.name || "Usuário"}
        </span>
        <span className="user-email">{user.email}</span>
      </div>
    </div>
  )
}
