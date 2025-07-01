"use client"

import { useState } from "react"
import { X, Trash2, Loader } from "lucide-react"
import "../styles/DeleteConfirmationModal.css"

export default function DeleteConfirmationModal({ store, isOpen, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      onClose()
    }
  }

  if (!isOpen || !store) return null

  return (
    <div className="delete-modal-overlay" onClick={handleClose}>
      <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-icon-container">
            <Trash2 size={32} className="delete-icon" />
          </div>
          <button onClick={handleClose} className="delete-modal-close-button" disabled={isDeleting}>
            <X size={20} />
          </button>
        </div>

        <div className="delete-modal-body">
          <h2 className="delete-modal-title">Confirmar Exclusão</h2>
          <p className="delete-modal-message">
            Tem certeza que deseja excluir a loja <strong>"{store.name}"</strong>?
          </p>
          <p className="delete-modal-warning">Esta ação não pode ser desfeita.</p>
        </div>

        <div className="delete-modal-actions">
          <button type="button" onClick={handleClose} className="delete-cancel-button" disabled={isDeleting}>
            Cancelar
          </button>
          <button onClick={handleConfirm} className="delete-confirm-button" disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader size={16} className="spinning" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Excluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
