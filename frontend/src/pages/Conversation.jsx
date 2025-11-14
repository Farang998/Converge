import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MessageBubble from "./MessageBubble";
import api from "../services/api";
import "./Conversation.css";

export default function Conversation() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [projectName, setProjectName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Fetch current user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await api.get("auth/identify-user/");
        if (data?.user) {
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    }
    loadUser();
  }, []);

  // WebSocket connection function
  const connectWebSocket = () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found for WebSocket connection");
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // WebSocket URL: ws://localhost:8000/ws/chat/project/<project_id>/?token=<token>
    const wsUrl = `ws://localhost:8000/ws/chat/project/${projectId}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected to project chat");
      setWsConnected(true);
      setError(""); // Clear any previous errors
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "connection_established") {
          console.log("WebSocket connection established:", data.message);
          if (data.project_name) {
            setProjectName(data.project_name);
          }
        } else if (data.type === "chat_message") {
          // New message received via WebSocket
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            // Check by ID first, then by content + timestamp if ID doesn't exist
            const existsById = prev.some((msg) => msg.id === data.id);
            if (existsById) {
              return prev;
            }
            // Also check if it's a temp message we just added optimistically
            const isTempDuplicate = prev.some((msg) => 
              msg.temp && 
              msg.content === data.content && 
              String(msg.sender?.id) === String(data.sender?.id)
            );
            if (isTempDuplicate) {
              // Replace temp message with real one from server
              return prev.map((msg) => 
                msg.temp && 
                msg.content === data.content && 
                String(msg.sender?.id) === String(data.sender?.id)
                  ? data
                  : msg
              );
            }
            return [...prev, data];
          });
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket disconnected", event.code, event.reason);
      setWsConnected(false);
      
      // Auto-reconnect after 3 seconds if not a normal closure
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect WebSocket...");
          connectWebSocket();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
    };
  };

  // Fetch initial project chat messages and connect WebSocket
  useEffect(() => {
    if (!projectId) {
      setError("Project ID is missing");
      setLoading(false);
      return;
    }

    async function loadMessages() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`chats/project/${projectId}/messages/`);
        if (data.messages) {
          setMessages(data.messages);
          setProjectName(data.project_name || "Project Chat");
        } else {
          setMessages([]);
          setProjectName(data.project_name || "Project Chat");
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
        if (err?.response?.status === 404) {
          setError("Chat not found for this project. It may not have been created yet.");
        } else if (err?.response?.status === 403) {
          setError("You don't have permission to access this chat.");
        } else {
          setError(err?.response?.data?.error || "Failed to load messages");
        }
      } finally {
        setLoading(false);
      }
    }

    loadMessages();

    // Connect WebSocket
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [projectId]);

  const sendMessage = () => {
    if (!input.trim() || sending) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError("WebSocket not connected. Please wait...");
      return;
    }

    const messageText = input.trim();
    setInput("");
    setSending(true);

    try {
      // Send via WebSocket - the server will broadcast it back, so we don't need optimistic update
      wsRef.current.send(JSON.stringify({
        content: messageText
      }));
      
      // Don't add optimistic message - wait for server broadcast to avoid duplicates
      // The WebSocket will receive the message back from the server with the real ID
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message");
      setInput(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-loading">
          <div className="loading-spinner"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="chat-container">
        <div className="chat-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentUserId = currentUser?.id ? String(currentUser.id) : null;

  return (
    <div className="chat-container">
      {/* Chat Header */}
      <div className="chat-header">
        <button 
          className="chat-back-btn" 
          onClick={() => navigate("/dashboard")}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <div className="chat-header-info">
          <h2 className="chat-title">{projectName}</h2>
          <p className="chat-subtitle">Group Chat</p>
        </div>

        <div className="chat-status">
          <div className={`status-indicator ${wsConnected ? "status-online" : "status-offline"}`}>
            <span className="status-dot"></span>
            <span className="status-text">{wsConnected ? "Online" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="chat-error-banner">
          <span className="error-icon-small">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Messages Area */}
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="empty-icon">💬</div>
            <h3>No messages yet</h3>
            <p>Start the conversation by sending a message below!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = currentUserId && (String(msg.sender?.id) === String(currentUserId));
              return (
                <MessageBubble
                  key={msg.id || `msg-${msg.timestamp || msg.created_at}`}
                  text={msg.content}
                  sender={msg.sender?.username || "Unknown"}
                  timestamp={msg.timestamp}
                  created_at={msg.created_at}
                  showSender={!isOwn}
                  isOwn={isOwn}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending || !wsConnected}
          />
          <button 
            className="chat-send-btn"
            onClick={sendMessage} 
            disabled={sending || !input.trim() || !wsConnected}
            title={!wsConnected ? "Waiting for connection..." : "Send message"}
          >
            {sending ? (
              <div className="send-spinner"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
