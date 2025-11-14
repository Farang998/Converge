import React from "react";
import "./Conversation.css";

export default function MessageBubble({ text, sender, isOwn, timestamp, created_at, showSender }) {
  // Format timestamp - use created_at if available, otherwise timestamp
  const formatTime = (timeValue) => {
    if (!timeValue) return "";
    try {
      const date = new Date(timeValue);
      if (isNaN(date.getTime())) return "";
      
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      // Show time for today's messages
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) {
        // Show time like "2:30 PM" for today
        return date.toLocaleTimeString("en-US", { 
          hour: "numeric", 
          minute: "2-digit",
          hour12: true 
        });
      }
      if (days < 7) {
        // Show day and time for this week
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayName = dayNames[date.getDay()];
        return `${dayName} ${date.toLocaleTimeString("en-US", { 
          hour: "numeric", 
          minute: "2-digit",
          hour12: true 
        })}`;
      }
      
      // Show full date for older messages
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
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

  return (
    <div className={`message-wrapper ${isOwn ? "message-own" : "message-other"}`}>
      <div className="message-bubble">
        {!isOwn && showSender && (
          <div className="message-sender-name">{displayName}</div>
        )}
        <div className="message-content">
          <div className="message-text">{text}</div>
          <div className="message-meta">
            {isOwn && <span className="message-sender-label">You</span>}
            {timeStr && <span className="message-time">{timeStr}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
