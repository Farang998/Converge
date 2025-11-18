import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import MessageBubble from "./MessageBubble";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import "./Conversation.css";

// Normalize timestamp to ISO string format (same as Conversation.jsx)
const normalizeTimestamp = (raw) => {
  if (!raw) return null;
  try {
    if (typeof raw === "number") {
      return new Date(raw > 10000000000 ? raw : raw * 1000).toISOString();
    }
    if (typeof raw === "string") {
      return new Date(raw).toISOString();
    }
    return raw;
  } catch {
    return null;
  }
};

export default function IndividualChat() {
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Current user is provided by AuthContext

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

    // WebSocket URL: ws://localhost:8000/ws/chat/individual/<chat_id>/?token=<token>
    const wsUrl = `ws://localhost:8000/ws/chat/individual/${chatId}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected to individual chat");
      setWsConnected(true);
      setError("");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "connection_established") {
          console.log("WebSocket connection established:", data.message);
        } else if (data.type === "chat_message") {
          // Normalize timestamps from incoming WebSocket message
          const normalizedData = {
            ...data,
            timestamp: normalizeTimestamp(data.timestamp),
            created_at: normalizeTimestamp(data.created_at),
          };
          setMessages((prev) => {
            const existsById = prev.some((msg) => msg.id === normalizedData.id);
            if (existsById) {
              return prev;
            }
            const isTempDuplicate = prev.some((msg) => 
              msg.temp && 
              msg.content === normalizedData.content && 
              String(msg.sender?.id) === String(normalizedData.sender?.id)
            );
            if (isTempDuplicate) {
              return prev.map((msg) => 
                msg.temp && 
                msg.content === normalizedData.content && 
                String(msg.sender?.id) === String(normalizedData.sender?.id)
                  ? normalizedData
                  : msg
              );
            }
            return [...prev, normalizedData];
          });
        } else if (data.type === "message_deleted") {
          setMessages((prev) => prev.filter((msg) => msg.id !== data.message_id));
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket disconnected", event.code, event.reason);
      setWsConnected(false);
      
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

  // Fetch initial messages and connect WebSocket
  useEffect(() => {
    if (!chatId) {
      setError("Chat ID is missing");
      setLoading(false);
      return;
    }

    async function loadMessages() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`chats/individual/${chatId}/messages/`);
        if (data.messages) {
          // Normalize timestamps for all messages
          const normalizedMessages = data.messages.map((msg) => ({
            ...msg,
            timestamp: normalizeTimestamp(msg.timestamp),
            created_at: normalizeTimestamp(msg.created_at),
          }));
          setMessages(normalizedMessages);
          setOtherUser(data.other_user);
        } else {
          setMessages([]);
          setOtherUser(data.other_user);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
        if (err?.response?.status === 404) {
          setError("Chat not found.");
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
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [chatId]);

  const sendMessage = async () => {
    if ((!input.trim() && !selectedFile) || sending || uploading) return;

    const messageText = input.trim();
    const fileToSend = selectedFile;

    // If there's a file, use REST API (multipart/form-data)
    if (fileToSend) {
      setUploading(true);
      setSending(true);
      
      try {
        const formData = new FormData();
        if (messageText) {
          formData.append('content', messageText);
        }
        formData.append('file', fileToSend);

        const { data } = await api.post(`chats/individual/${chatId}/send/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Message will be received via WebSocket broadcast
        setInput("");
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err) {
        console.error("Failed to send message with file:", err);
        setError(err?.response?.data?.error || "Failed to send message");
      } finally {
        setUploading(false);
        setSending(false);
      }
      return;
    }

    // Text-only message via WebSocket
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError("WebSocket not connected. Please wait...");
      return;
    }

    setInput("");
    setSending(true);

    try {
      wsRef.current.send(JSON.stringify({
        content: messageText
      }));
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message");
      setInput(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (50MB max)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      setError(`File size exceeds maximum allowed size of ${MAX_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDeleteMessage = (messageId) => {
    if (!messageId) return;
    
    // Find the message to get its content and file info
    const message = messages.find((msg) => msg.id === messageId);
    if (message) {
      setMessageToDelete({
        id: messageId,
        content: message.content,
        hasFile: !!message.file_url,
        fileName: message.file_name
      });
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    
    const messageId = messageToDelete.id;
    
    try {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      await api.delete(`chats/message/${messageId}/`);
    } catch (err) {
      console.error("Failed to delete message:", err);
      setError(err?.response?.data?.error || "Failed to delete message");
      
      try {
        const { data } = await api.get(`chats/individual/${chatId}/messages/`);
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (reloadErr) {
        console.error("Failed to reload messages:", reloadErr);
      }
    } finally {
      setMessageToDelete(null);
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

  const handleBack = () => {
    if (projectId) {
      navigate(`/chat/${projectId}`);
    } else {
      navigate("/dashboard");
    }
  };

  const handleSearch = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await api.get(`chats/individual/${chatId}/search/`, {
        params: { q: term }
      });
      // Normalize timestamps in search results
      const normalizedResults = (data.messages || []).map((msg) => ({
        ...msg,
        timestamp: normalizeTimestamp(msg.timestamp),
        created_at: normalizeTimestamp(msg.created_at),
      }));
      setSearchResults(normalizedResults);
      setShowSearchResults(true);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(value);
      }, 500);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchResults(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  const scrollToMessage = (messageId) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      messageElement.classList.add("search-highlight-message");
      setTimeout(() => {
        messageElement.classList.remove("search-highlight-message");
      }, 2000);
    }
    setShowSearchResults(false);
  };

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
          <button className="btn-primary" onClick={handleBack}>
            Back to {projectId ? "Project Chat" : "Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  const currentUserId = currentUser?.id ? String(currentUser.id) : null;

  return (
    <div className="chat-container" style={{ flexDirection: 'column' }}>
      {/* Chat Header */}
      <div className="chat-header">
        <button 
          className="chat-back-btn" 
          onClick={handleBack}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <div className="chat-header-info">
          <h2 className="chat-title">{otherUser?.username || "Individual Chat"}</h2>
          <p className="chat-subtitle">Direct Message</p>
        </div>

        {/* Search Bar */}
        <div className="chat-search-container">
          <div className="chat-search-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="chat-search-input"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => searchTerm && setShowSearchResults(true)}
            />
            {searchTerm && (
              <button 
                className="search-clear-btn"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
            {isSearching && (
              <div className="search-spinner"></div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results-dropdown">
              <div className="search-results-header">
                <span className="search-results-count">
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                </span>
                <button 
                  className="search-close-btn"
                  onClick={() => setShowSearchResults(false)}
                  aria-label="Close results"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="search-results-list">
                {searchResults.map((msg) => {
                  const isOwn = currentUserId && (String(msg.sender?.id) === String(currentUserId));
                  return (
                    <div
                      key={msg.id}
                      className="search-result-item"
                      onClick={() => scrollToMessage(msg.id)}
                    >
                      <div className="search-result-sender">
                        {isOwn ? "You" : (msg.sender?.username || "Unknown")}
                      </div>
                      <div className="search-result-content">
                        {highlightText(msg.content, searchTerm)}
                      </div>
                      <div className="search-result-time">
                        {new Date(msg.timestamp || msg.created_at).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showSearchResults && searchResults.length === 0 && searchTerm && !isSearching && (
            <div className="search-results-dropdown">
              <div className="search-no-results">
                No messages found for "{searchTerm}"
              </div>
            </div>
          )}
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
                <div key={msg.id || `msg-${msg.timestamp || msg.created_at}`} data-message-id={msg.id}>
                  <MessageBubble
                    text={msg.content}
                    sender={msg.sender?.username || "Unknown"}
                    timestamp={msg.timestamp}
                    created_at={msg.created_at}
                    showSender={!isOwn}
                    isOwn={isOwn}
                    messageId={msg.id}
                    onDelete={handleDeleteMessage}
                    file_url={msg.file_url}
                    file_type={msg.file_type}
                    file_name={msg.file_name}
                    file_size={msg.file_size}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="file-preview-container">
          <div className="file-preview">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="file-preview-image" />
            ) : (
              <div className="file-preview-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
            )}
            <div className="file-preview-info">
              <div className="file-preview-name">{selectedFile.name}</div>
              <div className="file-preview-size">{formatFileSize(selectedFile.size)}</div>
            </div>
            <button className="file-preview-remove" onClick={removeFile} aria-label="Remove file">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            id="file-input-individual"
            className="file-input-hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />
          <label htmlFor="file-input-individual" className="file-attach-btn" title="Attach file">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </label>
          <input
            type="text"
            className="chat-input"
            placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending || uploading || !wsConnected}
          />
          <button 
            className="chat-send-btn"
            onClick={sendMessage} 
            disabled={sending || uploading || (!input.trim() && !selectedFile) || !wsConnected}
            title={!wsConnected ? "Waiting for connection..." : "Send message"}
          >
            {(sending || uploading) ? (
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setMessageToDelete(null);
        }}
        onConfirm={confirmDeleteMessage}
        messageContent={messageToDelete?.content}
        hasFile={messageToDelete?.hasFile}
        fileName={messageToDelete?.fileName}
      />
    </div>
  );
}

