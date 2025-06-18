"use client"

import { useState, useEffect } from "react"
import { X, Save, Loader } from "lucide-react"
import { StoreService } from "../services/StoreService"
import { BrandsService } from "../services/BrandService"
import "../styles/StoreUpdateModal.css"

const paymentConditions = [
  { value: 1, label: "Dinheiro", name: "Cash" },
  { value: 2, label: "Cartão de Crédito", name: "CreditCard" },
  { value: 3, label: "Cartão de Débito", name: "DebitCard" },
  { value: 4, label: "Pix", name: "Pix" },
  { value: 5, label: "PayPal", name: "Paypal" },
]

export default function StoreUpdateModal({ store, isOpen, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    website: "",
    brands: [],
    paymentConditions: [],
  })
  const [availableBrands, setAvailableBrands] = useState([])
  const [isLoadingBrands, setIsLoadingBrands] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Initialize form data when store changes
  useEffect(() => {
    if (store && isOpen) {
      setFormData({
        name: store.name || "",
        address: store.address || "",
        email: store.email || "",
        website: store.website || "",
        brands: store.brands ? store.brands.map((brand) => brand.id || brand.name) : [],
        paymentConditions: store.paymentConditions || [],
      })
      setError("")
      setSuccess("")
    }
  }, [store, isOpen])

  // Fetch available brands
  useEffect(() => {
    if (isOpen) {
      const fetchBrands = async () => {
        setIsLoadingBrands(true)
        try {
          console.log("🔄 Fetching brands for update modal...")
          const brandsData = await BrandsService.getBrands()
          console.log("📦 Brands data received in modal:", brandsData)

          if (brandsData && Array.isArray(brandsData)) {
            setAvailableBrands(brandsData)
          } else {
            console.error("❌ Invalid brands data:", brandsData)
            setAvailableBrands([])
          }
        } catch (error) {
          console.error("❌ Error fetching brands in modal:", error)
          setAvailableBrands([])
        } finally {
          setIsLoadingBrands(false)
        }
      }

      fetchBrands()
    }
  }, [isOpen])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBrandChange = (e) => {
    const { value, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      brands: checked ? [...prev.brands, value] : prev.brands.filter((id) => id !== value),
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const updateRequest = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        latitude: store.latitude,
        longitude: store.longitude,
        brands: formData.brands,
        paymentConditions: formData.paymentConditions,
      }

      await StoreService.updateStore(store.id, updateRequest)
      setSuccess("Loja atualizada com sucesso!")

      // Call the onUpdate callback to refresh the stores list
      if (onUpdate) {
        onUpdate()
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error("Error updating store:", error)
      setError("Erro ao atualizar a loja. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Atualizar Loja</h2>
          <button onClick={handleClose} className="modal-close-button" disabled={isLoading}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error">{error}</div>}
          {success && <div className="modal-success">{success}</div>}

          <div className="form-group">
            <label className="form-label">
              Nome da Loja <span className="required">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="form-input"
              disabled={isLoading}
              maxLength={100}
            />
            <small className="field-hint">{formData.name.length}/100 caracteres</small>
          </div>

          <div className="form-group">
            <label className="form-label">Endereço</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="form-input"
              disabled={isLoading}
              maxLength={200}
            />
            <small className="field-hint">{formData.address.length}/200 caracteres</small>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Marcas <span className="required">*</span>
            </label>
            {isLoadingBrands ? (
              <div className="loading-message">Carregando marcas...</div>
            ) : (
              <div className="checkbox-group">
                {availableBrands.map((brand) => (
                  <label key={brand.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      value={brand.id}
                      checked={formData.brands.includes(brand.id)}
                      onChange={handleBrandChange}
                      disabled={isLoading}
                    />
                    <span className="checkbox-text">{brand.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
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

          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="cancel-button" disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className="save-button" disabled={isLoading || isLoadingBrands}>
              {isLoading ? (
                <>
                  <Loader size={16} className="spinning" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
