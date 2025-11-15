import React from "react";
import "./DeleteConfirmationModal.css";

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  messageContent,
  hasFile,
  fileName 
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="delete-modal-overlay" onClick={handleBackdropClick}>
      <div className="delete-modal-container">
        <div className="delete-modal-content">
          {/* Icon */}
          <div className="delete-modal-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>

          {/* Title */}
          <h2 className="delete-modal-title">Delete Message</h2>

          {/* Description */}
          <p className="delete-modal-description">
            Are you sure you want to delete this message{hasFile ? ` and file` : ""}? 
            This action cannot be undone.
          </p>

          {/* Message Preview */}
          {(messageContent || hasFile) && (
            <div className="delete-modal-preview">
              {hasFile && fileName && (
                <div className="delete-preview-file">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span className="delete-preview-file-name">{fileName}</span>
                </div>
              )}
              {messageContent && (
                <div className="delete-preview-text">
                  {messageContent.length > 100 
                    ? `${messageContent.substring(0, 100)}...` 
                    : messageContent}
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="delete-modal-actions">
            <button 
              className="delete-modal-btn delete-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="delete-modal-btn delete-modal-btn-confirm"
              onClick={handleConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

