"use client"

import { useState, useEffect } from "react"
import { User } from "lucide-react"

export default function UserProfile({ className = "" }) {
  const [user, setUser] = useState(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData)
        console.log("👤 User data loaded:", parsedUser)
        setUser(parsedUser)
        setImageError(false) // Reset image error when user changes
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }
  }, [])

  const handleImageError = () => {
    console.log("🖼️ User image failed to load, showing fallback icon")
    setImageError(true)
  }

  const handleImageLoad = () => {
    console.log("🖼️ User image loaded successfully")
    setImageError(false)
  }

  if (!user) {
    return (
      <div className={`avatar-container ${className}`}>
        <User className="avatar-icon" size={24} />
      </div>
    )
  }

  return (
    <div className={`user-profile ${className}`}>
      {user.picture && !imageError ? (
        <img
          src={user.picture || "/placeholder.svg"}
          alt={user.name || "User"}
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

      <div className="user-info">
        <span className="user-name">{user.name || user.email || "Usuário"}</span>
        <span className="user-email">{user.email}</span>
      </div>
    </div>
  )
}
