<<<<<<< HEAD
import React from "react";

export default function MessageBubble({ text, sender, isOwn, showSender }) {
  return (
    <div className={`message ${isOwn ? "own" : "other"}`}>
      {!isOwn && showSender && <div className="sender">{sender}</div>}
      <div className="bubble">{text}</div>
=======
import React, { useState } from "react";
import "./Conversation.css";

export default function MessageBubble({ text, sender, isOwn, timestamp, created_at, showSender, messageId, onDelete, file_url, file_type, file_name, file_size }) {
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [imageError, setImageError] = useState(false);
  // Format timestamp - use created_at if available, otherwise timestamp
  // Convert to Indian Standard Time (IST - UTC+5:30)
  const formatTime = (timeValue) => {
    if (!timeValue) return "";
    try {
      const date = new Date(timeValue);
      if (isNaN(date.getTime())) return "";
      
      // Get current time in IST
      const now = new Date();
      const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const msgIST = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      
      const diff = nowIST - msgIST;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      // Show time for today's messages
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) {
        // Show time like "2:30 PM" for today in IST
        return date.toLocaleTimeString("en-IN", { 
          timeZone: "Asia/Kolkata",
          hour: "numeric", 
          minute: "2-digit",
          hour12: true 
        });
      }
      if (days < 7) {
        // Show day and time for this week
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayName = dayNames[msgIST.getDay()];
        return `${dayName} ${date.toLocaleTimeString("en-IN", { 
          timeZone: "Asia/Kolkata",
          hour: "numeric", 
          minute: "2-digit",
          hour12: true 
        })}`;
      }
      
      // Show full date for older messages
      const msgYear = msgIST.getFullYear();
      const nowYear = nowIST.getFullYear();
      return date.toLocaleDateString("en-IN", { 
        timeZone: "Asia/Kolkata",
        month: "short", 
        day: "numeric",
        year: msgYear !== nowYear ? "numeric" : undefined,
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      console.error("Error formatting time:", e);
      return "";
    }
  };

  // Use created_at if available, otherwise fall back to timestamp
  const timeValue = created_at || timestamp;
  const displayName = isOwn ? "You" : (sender || "Unknown");
  const timeStr = formatTime(timeValue);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete && messageId) {
      onDelete(messageId);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        );
      case 'video':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        );
      case 'audio':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        );
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        );
    }
  };

  const getMediaUrl = () => {
    if (!file_url) return null;
    // If it's already a full URL, return as is
    if (file_url.startsWith('http://') || file_url.startsWith('https://')) {
      return file_url;
    }
    // Otherwise, prepend the API base URL
    const baseUrl = import.meta.env?.VITE_API_BASE || 'http://localhost:8000/api/';
    const apiBase = baseUrl.replace('/api/', '');
    return `${apiBase}${file_url}`;
  };

  const mediaUrl = getMediaUrl();

  return (
    <div 
      className={`message-wrapper ${isOwn ? "message-own" : "message-other"}`}
      onMouseEnter={() => isOwn && setShowDeleteButton(true)}
      onMouseLeave={() => setShowDeleteButton(false)}
    >
      <div className="message-bubble">
        {!isOwn && showSender && (
          <div className="message-sender-name">{displayName}</div>
        )}
        <div className="message-content">
          {/* Media Display */}
          {file_url && (
            <div className="message-media">
              {file_type === 'image' && !imageError ? (
                <div className="message-image-container">
                  <img 
                    src={mediaUrl} 
                    alt={file_name || "Image"} 
                    className="message-image"
                    onError={() => setImageError(true)}
                    onClick={() => window.open(mediaUrl, '_blank')}
                  />
                </div>
              ) : file_type === 'video' ? (
                <div className="message-video-container">
                  <video 
                    src={mediaUrl} 
                    controls 
                    className="message-video"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : file_type === 'audio' ? (
                <div className="message-audio-container">
                  <audio src={mediaUrl} controls className="message-audio">
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              ) : (
                <a 
                  href={mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="message-file-download"
                >
                  <div className="message-file-icon">
                    {getFileIcon(file_type)}
                  </div>
                  <div className="message-file-info">
                    <div className="message-file-name">{file_name || "File"}</div>
                    {file_size && (
                      <div className="message-file-size">{formatFileSize(file_size)}</div>
                    )}
                  </div>
                  <svg className="message-file-download-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </a>
              )}
            </div>
          )}
          
          {/* Text Content */}
          {text && <div className="message-text">{text}</div>}
          
          <div className="message-meta">
            {isOwn && <span className="message-sender-label">You</span>}
            {timeStr && <span className="message-time">{timeStr}</span>}
            {isOwn && onDelete && (
              <button
                className={`message-delete-btn ${showDeleteButton ? "show" : ""}`}
                onClick={handleDelete}
                aria-label="Delete message"
                title="Delete message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)
    </div>
  );
}
