import React, { useEffect, useState } from "react";
import MessageBubble from "./MessageBubble";
<<<<<<< HEAD

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
=======
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
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
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
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
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)

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
<<<<<<< HEAD

          // Handle connection confirmation
          if (data.type === "connection_established") {
            console.log(data.message);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
=======
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
        } else if (data.type === "message_deleted") {
          // Message deleted via WebSocket
          setMessages((prev) => prev.filter((msg) => msg.id !== data.message_id));
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)
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

<<<<<<< HEAD
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
=======
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
    };
  };

  // Load team members
  useEffect(() => {
    if (!projectId) return;

    async function loadTeamMembers() {
      setLoadingMembers(true);
      try {
        const { data } = await api.get(`chats/project/${projectId}/team-members/`);
        if (data.team_members) {
          setTeamMembers(data.team_members);
        }
      } catch (err) {
        console.error("Failed to load team members:", err);
      } finally {
        setLoadingMembers(false);
      }
    }

    loadTeamMembers();
  }, [projectId]);

  // Fetch initial project chat messages and connect WebSocket
  useEffect(() => {
    if (!projectId) {
      setError("Project ID is missing");
      setLoading(false);
      return;
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)
    }

    // Cleanup connection on component unmount or chat switch
    return () => {
<<<<<<< HEAD
      if (socket) socket.close();
=======
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
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)
    };
  }, [activeConversation]);

<<<<<<< HEAD
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
=======
  const handleStartIndividualChat = async (member) => {
    try {
      const { data } = await api.post(`chats/project/${projectId}/individual-chat/`, {
        other_user_id: member.user_id
      });
      if (data.chat_id) {
        navigate(`/chat/individual/${data.chat_id}?projectId=${projectId}`);
      }
    } catch (err) {
      console.error("Failed to start individual chat:", err);
      setError(err?.response?.data?.error || "Failed to start individual chat");
    }
  };

  const getInitials = (username) => {
    if (!username) return "?";
    const parts = username.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const handleSearch = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await api.get(`chats/project/${projectId}/search/`, {
        params: { q: term }
      });
      setSearchResults(data.messages || []);
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

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search - wait 500ms after user stops typing
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

        const { data } = await api.post(`chats/project/${projectId}/send/`, formData, {
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
      // Optimistically remove message from UI
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      
      // Call API to delete message
      await api.delete(`chats/message/${messageId}/`);
      
      // If successful, message is already removed from UI
      // If it fails, we could restore it or show an error
    } catch (err) {
      console.error("Failed to delete message:", err);
      setError(err?.response?.data?.error || "Failed to delete message");
      
      // Reload messages to restore state
      try {
        const { data } = await api.get(`chats/project/${projectId}/messages/`);
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
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)
  };

  // 3. Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    const messagesDiv = document.querySelector(".messages");
    if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, [messages]);

  // 4. Render chat UI
  return (
<<<<<<< HEAD
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
=======
    <div className="chat-container">
      {/* Team Members Sidebar */}
      {showSidebar && (
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <h3 className="sidebar-title">Team Members</h3>
            <button 
              className="sidebar-toggle-btn"
              onClick={() => setShowSidebar(false)}
              aria-label="Hide sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="sidebar-content">
            {loadingMembers ? (
              <div className="sidebar-loading">Loading members...</div>
            ) : teamMembers.length === 0 ? (
              <div className="sidebar-empty">No other team members</div>
            ) : (
              <div className="team-members-list">
                {teamMembers.map((member) => (
                  <button
                    key={member.user_id}
                    className="team-member-item"
                    onClick={() => handleStartIndividualChat(member)}
                    title={`Chat with ${member.username}`}
                  >
                    <div className="member-avatar">
                      {getInitials(member.username)}
                    </div>
                    <div className="member-info">
                      <div className="member-name">
                        {member.username}
                        {member.is_leader && (
                          <span className="member-badge">Leader</span>
                        )}
                      </div>
                      <div className="member-subtitle">Click to chat</div>
                    </div>
                    <svg 
                      className="member-arrow" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className={`chat-main ${showSidebar ? "with-sidebar" : ""}`}>
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

          {!showSidebar && (
            <button 
              className="chat-sidebar-toggle-btn" 
              onClick={() => setShowSidebar(true)}
              aria-label="Show team members"
              title="Show team members"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 10H3M21 6H3M21 14H3M17 18H3"/>
              </svg>
            </button>
          )}
          
          <div className="chat-header-info">
            <h2 className="chat-title">{projectName}</h2>
            <p className="chat-subtitle">Group Chat</p>
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
            id="file-input"
            className="file-input-hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />
          <label htmlFor="file-input" className="file-attach-btn" title="Attach file">
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
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)
    </div>
  );
}
