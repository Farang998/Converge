import React, { useEffect, useRef } from "react";
import "./Conversation.css";

// Format IST DateTime (same as MessageBubble.jsx)
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

  return `${dateStr} ${timeStr}`;
};

const ThreadPanel = ({
  projectName,
  parentMessage,
  replies = [],
  loading,
  error,
  onClose,
  inputValue,
  onInputChange,
  onSend,
  onKeyDown,
  sending,
  wsConnected,
  currentUserId,
  alsoSendToChannel = false,
  onAlsoSendToChannelChange,
}) => {
  const repliesRef = useRef(null);

  useEffect(() => {
    if (repliesRef.current) {
      repliesRef.current.scrollTop = repliesRef.current.scrollHeight;
    }
  }, [replies, loading]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(/[._-\s]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderMedia = (message) => {
    if (!message?.file_url) return null;

    switch (message.file_type) {
      case "image":
        return (
          <div className="thread-media-block">
            <img src={message.file_url} alt={message.file_name || "preview"} className="thread-media-image" />
          </div>
        );
      case "video":
        return (
          <div className="thread-media-block">
            <video src={message.file_url} controls className="thread-media-video">
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case "audio":
        return (
          <div className="thread-media-block thread-audio">
            <audio src={message.file_url} controls>
              Your browser does not support the audio tag.
            </audio>
          </div>
        );
      default:
        return (
          <a
            href={message.file_url}
            className="thread-file-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="thread-file-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="thread-file-info">
              <span className="thread-file-name">{message.file_name || "Attachment"}</span>
              {message.file_size && (
                <span className="thread-file-size">
                  {formatFileSize(message.file_size)}
                </span>
              )}
            </div>
          </a>
        );
    }
  };

  const repliesTotal =
    typeof parentMessage?.replies_count === "number"
      ? parentMessage.replies_count
      : replies?.length || 0;

  const disableSend = !inputValue.trim() || sending || !wsConnected;

  return (
    <aside className="thread-panel">
      <div className="thread-header">
        <div className="thread-header-content">
          <p className="thread-title">Thread</p>
          <p className="thread-subtitle">#{projectName || "this chat"}</p>
        </div>
        <button className="thread-close-btn" onClick={onClose} aria-label="Close thread">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="thread-body">
        <div className="thread-parent-card">
          <div className="thread-parent-avatar">
            {getInitials(
              parentMessage
                ? (currentUserId && String(parentMessage?.sender?.id) === String(currentUserId)
                    ? "You"
                    : parentMessage?.sender?.username || "Unknown")
                : "U"
            )}
          </div>
          <div className="thread-parent-content">
            <div className="thread-parent-meta">
              <span className="thread-parent-author">
                {parentMessage
                  ? (currentUserId && String(parentMessage?.sender?.id) === String(currentUserId)
                      ? "You"
                      : parentMessage?.sender?.username || "Unknown")
                  : ""}
              </span>
              <span className="thread-parent-time">
                {formatISTDateTime(parentMessage?.timestamp, parentMessage?.created_at)}
              </span>
            </div>
            {parentMessage?.content && (
              <p className="thread-parent-text">{parentMessage.content}</p>
            )}
            {renderMedia(parentMessage)}
          </div>
        </div>

        <div className="thread-divider">
          {repliesTotal > 0 ? `${repliesTotal} ${repliesTotal === 1 ? "reply" : "replies"}` : "Start a thread"}
        </div>

        <div className="thread-replies" ref={repliesRef}>
          {loading ? (
            <div className="thread-loading">
              <div className="loading-spinner small"></div>
              <span>Loading replies...</span>
            </div>
          ) : replies?.length > 0 ? (
            replies.map((reply) => {
              const isOwn = currentUserId && String(reply.sender?.id) === String(currentUserId);
              return (
                <div
                  className={`thread-reply ${isOwn ? "own" : ""}`}
                  key={reply.id || `${reply.thread_id}-${reply.created_at}`}
                >
                  <div className="thread-reply-avatar">
                    {getInitials(reply.sender?.username || "U")}
                  </div>
                  <div className="thread-reply-bubble">
                    <div className="thread-reply-header">
                      <span className="thread-reply-author">{isOwn ? "You" : reply.sender?.username}</span>
                      <span className="thread-reply-time">
                        {formatISTDateTime(reply.timestamp, reply.created_at)}
                      </span>
                    </div>
                    {reply.content && (
                      <p className="thread-reply-text">{reply.content}</p>
                    )}
                    {renderMedia(reply)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="thread-empty">
              <p>No replies yet. Start the conversation!</p>
            </div>
          )}
        </div>
      </div>

      <div className="thread-input-area">
        <textarea
          className="thread-input"
          placeholder="Reply..."
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!wsConnected || sending}
          rows={3}
        />
        {onAlsoSendToChannelChange && (
          <label className="thread-send-to-channel-checkbox">
            <input
              type="checkbox"
              checked={alsoSendToChannel}
              onChange={(e) => onAlsoSendToChannelChange(e.target.checked)}
              disabled={!wsConnected || sending}
            />
            <span>Also send to #{projectName || "channel"}</span>
          </label>
        )}
        <div className="thread-input-toolbar">
          <button
            className="thread-send-btn"
            onClick={onSend}
            disabled={disableSend}
            title={!wsConnected ? "Waiting for connection..." : "Send reply"}
          >
            {sending ? (
              <div className="send-spinner small"></div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
        {error && <div className="thread-inline-error">{error}</div>}
      </div>
    </aside>
  );
};

export default ThreadPanel;
