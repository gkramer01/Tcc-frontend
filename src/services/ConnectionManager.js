class ConnectionManager {
  constructor() {
    this.apiUrls = [
      "https://localhost:7240/api",
      "http://localhost:7240/api",
      "https://127.0.0.1:7240/api",
      "http://127.0.0.1:7240/api",
    ]

    this.workingUrl = localStorage.getItem("workingApiUrl") || this.apiUrls[0]
    this.lastSuccessTime = Number.parseInt(localStorage.getItem("lastApiSuccess") || "0")
    this.failureCount = Number.parseInt(localStorage.getItem("apiFailureCount") || "0")
    this.isOnline = navigator.onLine
    this.connectionStatus = "unknown"

    this.setupEventListeners()
    this.startHealthCheck()
  }

  setupEventListeners() {
    // Detectar mudanças de conectividade
    window.addEventListener("online", () => {
      console.log("🌐 Network back online")
      this.isOnline = true
      this.resetFailureCount()
      this.testConnection()
    })

    window.addEventListener("offline", () => {
      console.log("📴 Network offline")
      this.isOnline = false
      this.connectionStatus = "offline"
    })

    // Detectar mudanças de foco (usuário volta para a aba)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.shouldRetest()) {
        console.log("👁️ Page visible, retesting connection")
        this.testConnection()
      }
    })
  }

  shouldRetest() {
    const now = Date.now()
    const timeSinceLastSuccess = now - this.lastSuccessTime

    // Retesta se:
    // 1. Mais de 30 segundos desde o último sucesso
    // 2. Houve falhas recentes
    // 3. Status é desconhecido
    return timeSinceLastSuccess > 30000 || this.failureCount > 0 || this.connectionStatus === "unknown"
  }

  async testConnection() {
    if (!this.isOnline) {
      this.connectionStatus = "offline"
      return false
    }

    console.log("🔍 Testing API connection...")

    for (const url of this.apiUrls) {
      if (await this.testSingleUrl(url)) {
        this.markSuccess(url)
        return true
      }
    }

    this.markFailure()
    return false
  }

  async testSingleUrl(url) {
    const testEndpoints = [
      "", // Root API
      "/health", // Health check
      "/brands", // Known endpoint
    ]

    for (const endpoint of testEndpoints) {
      try {
        console.log(`🧪 Testing ${url}${endpoint}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(`${url}${endpoint}`, {
          method: "GET",
          mode: "cors",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Considera sucesso se não for erro de rede
        if (response.status !== 0 && response.status < 500) {
          console.log(`✅ ${url} is working (status: ${response.status})`)
          return true
        }
      } catch (error) {
        console.log(`❌ ${url}${endpoint} failed:`, error.message)

        // Se for erro de CORS, tenta estratégias alternativas
        if (error.message.includes("CORS") || error.name === "TypeError") {
          if (await this.tryAlternativeStrategies(url, endpoint)) {
            return true
          }
        }
      }
    }

    return false
  }

  async tryAlternativeStrategies(url, endpoint) {
    const strategies = [
      // Estratégia 1: Sem credentials
      {
        mode: "cors",
        credentials: "omit",
        headers: { Accept: "application/json" },
      },
      // Estratégia 2: No-cors (limitado)
      {
        mode: "no-cors",
        credentials: "omit",
      },
      // Estratégia 3: Apenas headers básicos
      {
        mode: "cors",
        credentials: "include",
        headers: {},
      },
    ]

    for (const strategy of strategies) {
      try {
        console.log(`🔄 Trying alternative strategy for ${url}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const response = await fetch(`${url}${endpoint}`, {
          method: "GET",
          ...strategy,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Para no-cors, não podemos verificar status
        if (strategy.mode === "no-cors" || (response.status !== 0 && response.status < 500)) {
          console.log(`✅ Alternative strategy worked for ${url}`)
          return true
        }
      } catch (error) {
        console.log(`❌ Alternative strategy failed:`, error.message)
      }
    }

    return false
  }

  markSuccess(url) {
    this.workingUrl = url
    this.lastSuccessTime = Date.now()
    this.failureCount = 0
    this.connectionStatus = "connected"

    localStorage.setItem("workingApiUrl", url)
    localStorage.setItem("lastApiSuccess", this.lastSuccessTime.toString())
    localStorage.setItem("apiFailureCount", "0")

    console.log(`✅ Connection established with ${url}`)
    this.notifyConnectionChange("connected")
  }

  markFailure() {
    this.failureCount++
    this.connectionStatus = "failed"

    localStorage.setItem("apiFailureCount", this.failureCount.toString())

    console.log(`❌ Connection failed (attempt ${this.failureCount})`)
    this.notifyConnectionChange("failed")
  }

  resetFailureCount() {
    this.failureCount = 0
    localStorage.setItem("apiFailureCount", "0")
  }

  notifyConnectionChange(status) {
    window.dispatchEvent(
      new CustomEvent("connectionStatusChanged", {
        detail: { status, url: this.workingUrl, failures: this.failureCount },
      }),
    )
  }

  startHealthCheck() {
    // Verifica conexão a cada 60 segundos se houver falhas
    setInterval(() => {
      if (this.failureCount > 0 || this.connectionStatus !== "connected") {
        console.log("🔄 Periodic health check...")
        this.testConnection()
      }
    }, 60000)
  }

  getWorkingUrl() {
    return this.workingUrl
  }

  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      url: this.workingUrl,
      failures: this.failureCount,
      isOnline: this.isOnline,
      lastSuccess: this.lastSuccessTime,
    }
  }

  async makeRequest(endpoint, options = {}) {
    // Se não estamos online, falha imediatamente
    if (!this.isOnline) {
      throw new Error("Sem conexão com a internet")
    }

    // Se tivemos muitas falhas, testa conexão primeiro
    if (this.failureCount > 2) {
      console.log("🔄 Many failures detected, testing connection first...")
      await this.testConnection()
    }

    const maxRetries = 3
    let lastError = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 Request attempt ${attempt}/${maxRetries} to ${this.workingUrl}${endpoint}`)

        const response = await this.attemptRequest(`${this.workingUrl}${endpoint}`, options)

        if (response.ok || response.status < 500) {
          this.markSuccess(this.workingUrl)
          return response
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, error.message)
        lastError = error

        // Se for erro de rede/CORS, tenta próxima URL
        if (this.isNetworkError(error) && attempt < maxRetries) {
          console.log("🔄 Network error detected, trying next URL...")
          await this.findWorkingUrl()
        }

        // Aguarda antes de tentar novamente
        if (attempt < maxRetries) {
          await this.delay(1000 * attempt)
        }
      }
    }

    this.markFailure()
    throw lastError || new Error("Todas as tentativas de conexão falharam")
  }

  async findWorkingUrl() {
    for (const url of this.apiUrls) {
      if (url !== this.workingUrl && (await this.testSingleUrl(url))) {
        this.workingUrl = url
        return true
      }
    }
    return false
  }

  async attemptRequest(url, options) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
      const response = await fetch(url, {
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)

      // Se for erro de CORS, tenta estratégias alternativas
      if (this.isNetworkError(error)) {
        console.log("🔄 Trying alternative request strategies...")
        return await this.tryAlternativeRequest(url, options)
      }

      throw error
    }
  }

  async tryAlternativeRequest(url, options) {
    // Estratégia sem credentials
    try {
      const response = await fetch(url, {
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "application/json",
          ...options.headers,
        },
        ...options,
      })

      if (response.ok || response.status < 500) {
        return response
      }
    } catch (error) {
      console.log("❌ Alternative request failed:", error.message)
    }

    throw new Error("Falha na conexão com o servidor")
  }

  isNetworkError(error) {
    return (
      error.name === "TypeError" ||
      error.message.includes("CORS") ||
      error.message.includes("fetch") ||
      error.message.includes("NetworkError") ||
      error.message.includes("Failed to fetch")
    )
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Instância singleton
export const connectionManager = new ConnectionManager()
