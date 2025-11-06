import React, { useState } from "react";
import MessageBubble from "./MessageBubble";

export default function Conversation({ activeConversation, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  if (!activeConversation) {
    return <div className="no-chat">Select a conversation to start chatting</div>;
  }

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMessage = {
      text: input,
      sender: currentUserId === 1 ? "You" : "Teammate",
    };
    setMessages([...messages, newMessage]);
    setInput("");
  };

  return (
    <div className="conversation-container">
      <header>
        <h3>
          {activeConversation.name}{" "}
          {activeConversation.type === "group" ? "(Group)" : ""}
        </h3>
      </header>

      <div className="messages">
        {messages.map((msg, index) => (
          <MessageBubble
            key={index}
            text={msg.text}
            sender={msg.sender}
            showSender={activeConversation.type === "group"}
            isOwn={msg.sender === "You"}
          />
        ))}
      </div>

      <footer>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </footer>
    </div>
  );
}
