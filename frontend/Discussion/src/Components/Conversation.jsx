import React, { useEffect, useState } from "react";
import MessageBubble from "./MessageBubble";

// Utility function to decode JWT and check if it’s expired
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    const now = Date.now() / 1000;
    return decoded.exp < now;
  } catch (e) {
    console.error("Invalid token:", e);
    return true;
  }
}

// Function to refresh the access token using refresh token 
async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;

  try {
    const response = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) throw new Error("Token refresh failed");

    const data = await response.json();
    localStorage.setItem("access_token", data.access);
    return data.access;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

export default function Conversation({ activeConversation, currentUserId }) {
  const [messages, setMessages] = useState([]); 
  const [input, setInput] = useState(""); 
  const [socket, setSocket] = useState(null); 

  if (!activeConversation) {
    return <div className="no-chat">Select a conversation to start chatting</div>;
  }

  // 1. Connect to WebSocket when a conversation opens
  useEffect(() => {
    if (!activeConversation) return;

    let token = localStorage.getItem("access_token");

    // Refreshing token if expired
    if (isTokenExpired(token)) {
      console.log("🔄 Access token expired, refreshing...");
      refreshAccessToken().then((newToken) => {
        if (newToken) connectWebSocket(newToken);
      });
    } else {
      connectWebSocket(token);
    }

    function connectWebSocket(activeToken) {
      const wsUrl = `ws://127.0.0.1:8000/ws/chatroom/${activeConversation.name}/?token=${activeToken}`;
      const ws = new WebSocket(wsUrl);
      setSocket(ws);

      ws.onopen = () => {
        console.log("Connected to WebSocket:", activeConversation.name);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle new incoming messages
          if (data.type === "chat_message" && data.message) {
            setMessages((prev) => [...prev, data.message]);
          }

          // Handle connection confirmation
          if (data.type === "connection_established") {
            console.log(data.message);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        console.log("Disconnected from WebSocket:", activeConversation.name);
        // Auto-reconnect after 2 seconds
        setTimeout(() => {
          console.log("Attempting to reconnect...");
          connectWebSocket(activeToken);
        }, 2000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }

    // Cleanup connection on component unmount or chat switch
    return () => {
      if (socket) socket.close();
    };
  }, [activeConversation]);

  // 2. Send message to backend
  const sendMessage = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected.");
      return;
    }

    if (!input.trim()) return;

    const messageData = {
      message: input,
      sender: currentUserId, // backend verifies via JWT anyway
    };

    socket.send(JSON.stringify(messageData));

    setMessages((prev) => [
      ...prev,
      { sender: "You", content: input, temp: true },
    ]);

    setInput("");
  };

  // 3. Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    const messagesDiv = document.querySelector(".messages");
    if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, [messages]);

  // 4. Render chat UI
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
            text={msg.content || msg.text}
            sender={msg.sender || "Unknown"}
            showSender={activeConversation.type === "group"}
            isOwn={msg.sender === "You" || msg.sender === currentUserId}
          />
        ))}
      </div>

      <footer>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </footer>
    </div>
  );
}
