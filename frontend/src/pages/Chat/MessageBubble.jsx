import React, { useState } from "react";
import "./Conversation.css";
const formatISTDateTime = (timestamp, fallbackTimestamp) => {
  if (!timestamp && !fallbackTimestamp) return "";

  const source = timestamp || fallbackTimestamp;
  const date = new Date(source);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const nowIST = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const dateIST = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const todayIST = new Date(
    nowIST.getFullYear(),
    nowIST.getMonth(),
    nowIST.getDate()
  );

  const messageDateIST = new Date(
    dateIST.getFullYear(),
    dateIST.getMonth(),
    dateIST.getDate()
  );

  const isToday = messageDateIST.getTime() === todayIST.getTime();

  const yesterdayIST = new Date(todayIST);
  yesterdayIST.setDate(yesterdayIST.getDate() - 1);
  const isYesterday = messageDateIST.getTime() === yesterdayIST.getTime();

  const timeStr = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  if (isToday) return `Today ${timeStr}`;
  if (isYesterday) return `Yesterday ${timeStr}`;

  const dateStr = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year:
      dateIST.getFullYear() !== nowIST.getFullYear() ? "numeric" : undefined,
    timeZone: "Asia/Kolkata",
  });

  return `${dateStr}, ${timeStr}`;
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function MessageBubble({
  text,
  sender,
  isOwn,
  showSender,
  timestamp,
  created_at,
  messageId,
  onDelete,
  file_url,
  file_type,
  file_name,
  file_size,
  threadId,
  repliesCount = 0,
  onReply,
}) {
  const [showDeleteBtn, setShowDeleteBtn] = useState(false);
  const [imageError, setImageError] = useState(false);
  // Fixed timestamp normalization

  const formattedTime = formatISTDateTime(timestamp, created_at);
  const displaySender = showSender && !isOwn && sender;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete && messageId) {
      onDelete(messageId);
    }
  };

  const renderMedia = () => {
    if (!file_url) return null;
    // Normalize detection: backend may send MIME type like "image/png"
    const type = (file_type || "").toLowerCase();
    const name = (file_name || "").toLowerCase();

    const looksLikeImage =
      type.startsWith("image") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
    const looksLikeVideo = type.startsWith("video") || /\.(mp4|webm|ogg|mov)$/i.test(name);
    const looksLikeAudio = type.startsWith("audio") || /\.(mp3|wav|ogg)$/i.test(name);

    if (looksLikeImage) {
      if (imageError) {
        // fall back to file download view if image fails to load
        return (
          <div className="message-file-download">
            <div className="message-file-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="message-file-info">
              <div className="message-file-name">{file_name || "Image"}</div>
              {file_size && <div className="message-file-size">{formatFileSize(file_size)}</div>}
            </div>
            <a
              href={file_url}
              download={file_name}
              className="message-file-download-icon"
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </a>
          </div>
        );
      }

      return (
        <div className="message-image-container">
          <img
            src={file_url}
            alt={file_name || "Image"}
            className="message-image"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (looksLikeVideo) {
      return (
        <div className="message-video-container">
          <video src={file_url} controls className="message-video">
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (looksLikeAudio) {
      return (
        <div className="message-audio-container">
          <audio src={file_url} controls className="message-audio">
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    // default: file download view
    return (
      <div className="message-file-download">
        <div className="message-file-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <div className="message-file-info">
          <div className="message-file-name">{file_name || "File"}</div>
          {file_size && <div className="message-file-size">{formatFileSize(file_size)}</div>}
        </div>
        <a
          href={file_url}
          download={file_name}
          className="message-file-download-icon"
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </a>
      </div>
    );
  };

  return (
    <div
      className={`message-wrapper ${isOwn ? "message-own" : "message-other"}`}
      onMouseEnter={() => setShowDeleteBtn(true)}
      onMouseLeave={() => setShowDeleteBtn(false)}
    >
      <div className="message-bubble">
        {displaySender && (
          <div className="message-sender-name">{sender}</div>
        )}
        <div className="message-content">
          {file_url && renderMedia()}
          {text && (
            <div className="message-text">{text}</div>
          )}
          <div className="message-meta">
            {formattedTime && (
              <span className="message-time" title={formattedTime}>
                {formattedTime}
              </span>
            )}
            {onDelete && messageId && (
              <button
                className={`message-delete-btn ${showDeleteBtn ? "show" : ""}`}
                onClick={handleDelete}
                title="Delete message"
                aria-label="Delete message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            )}
          </div>
          {onReply && (
            <div className="message-thread-footer">
              {repliesCount > 0 && (
                <button
                  className="message-thread-btn"
                  onClick={() => onReply({ threadId, messageId })}
                >
                  <span className="thread-count">
                    {repliesCount} {repliesCount === 1 ? "reply" : "replies"}
                  </span>
                  <span className="thread-view-label">View thread</span>
                </button>
              )}
              <button
                className="message-reply-btn"
                onClick={() => onReply({ threadId, messageId })}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-1a4 4 0 0 0-4-4H4" />
                </svg>
                Reply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
