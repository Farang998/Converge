import React from "react";

export default function MessageBubble({ text, sender, isOwn, showSender }) {
  return (
    <div className={`message ${isOwn ? "own" : "other"}`}>
      {!isOwn && showSender && <div className="sender">{sender}</div>}
      <div className="bubble">{text}</div>
    </div>
  );
}
