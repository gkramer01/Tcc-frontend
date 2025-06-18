export function decodeGoogleCredential(credential) {
  try {
    const parts = credential.split(".")
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format")
    }

    const payload = parts[1]
    const decodedPayload = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(decodedPayload)
  } catch (error) {
    console.error("Error decoding Google credential:", error)
    return null
  }
}

export function extractUserInfoFromCredential(credential) {
  const decoded = decodeGoogleCredential(credential)
  if (!decoded) return null

  return {
    email: decoded.email,
    name: decoded.name,
    picture: decoded.picture,
    givenName: decoded.given_name,
    familyName: decoded.family_name,
  }
}
