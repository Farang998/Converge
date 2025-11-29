import React, { useState, useEffect, useRef } from "react";
import ChatToAI from "./ChatToAI";
import { useParams, useNavigate } from "react-router-dom";
import MessageBubble from "./MessageBubble";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import "./Conversation.css";
import ThreadPanel from "./ThreadPanel";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Conversation() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [showAIChat, setShowAIChat] = useState(false);
  const [activeSection, setActiveSection] = useState('group');
  const [input, setInput] = useState("");
  const [projectName, setProjectName] = useState("");
  const { user: currentUser } = useAuth();
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
  const [activeThread, setActiveThread] = useState(null); 
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [threadInput, setThreadInput] = useState("");
  const [threadSending, setThreadSending] = useState(false);
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);
  const [chatSummary, setChatSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const activeThreadRef = useRef(null);

  // Current user is provided by AuthContext

  // Helper: normalize timestamp values coming from server (ISO, numeric string, or ms)
  const normalizeTimestamp = (raw) => {
    if (!raw) return null;
    try {
      // If it's already a number, decide ms vs seconds
      if (typeof raw === 'number') {
        return raw > 1e12 ? new Date(raw).toISOString() : new Date(raw * 1000).toISOString();
      }
      // If it's a numeric string
      if (typeof raw === 'string' && /^\d+$/.test(raw)) {
        const n = Number(raw);
        return n > 1e12 ? new Date(n).toISOString() : new Date(n * 1000).toISOString();
      }
      // Try parsing as Date string
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch (e) {
      console.warn('Failed to normalize timestamp', raw, e);
    }
    return null;
  };

  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

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
          // Normalize timestamp coming from WebSocket before storing
          if (data.timestamp) {
            const normalized = normalizeTimestamp(data.timestamp);
            if (normalized) {
              data.timestamp = normalized;
              // keep created_at in sync for compatibility
              data.created_at = normalized;
            }
          }

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
        } else if (data.type === "thread_message") {
          const parentId = String(data.parent_message_id);

          setMessages((prev) =>
            prev.map((msg) => {
              if (String(msg.id) === parentId) {
                const nextCount = (msg.replies_count || 0) + 1;
                return {
                  ...msg,
                  thread_id: data.thread_id || msg.thread_id,
                  replies_count: nextCount,
                };
              }
              return msg;
            })
          );

          const currentThread = activeThreadRef.current;
          if (currentThread && String(currentThread.parentMessage?.id) === parentId) {
            setThreadMessages((prev) => [...prev, data]);
            setActiveThread((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                threadId: data.thread_id || prev.threadId,
                parentMessage: {
                  ...prev.parentMessage,
                  thread_id: data.thread_id || prev.parentMessage.thread_id,
                  replies_count: (prev.parentMessage.replies_count || 0) + 1,
                },
              };
            });
          }
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
    }

    async function loadMessages() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`chats/project/${projectId}/messages/`);
        if (data.messages) {
          // Normalize timestamps coming from API to a consistent ISO string
          const normalized = data.messages.map((m) => ({
            ...m,
            timestamp: m.timestamp ? normalizeTimestamp(m.timestamp) : null,
            created_at: m.created_at ? normalizeTimestamp(m.created_at) : null,
          }));

          setMessages(normalized);
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
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [projectId]);

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

  const handleReplyClick = async (message) => {
    if (!message) return;

    setActiveThread({
      parentMessage: message,
      threadId: message.thread_id || null,
    });
    setThreadMessages([]);
    setThreadError("");
    setThreadInput("");

    if (!message.thread_id) {
      setThreadLoading(false);
      return;
    }


    setThreadLoading(true);
    try {
      const { data } = await api.get(`chats/project/${projectId}/threads/${message.thread_id}/`);
      setActiveThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          threadId: data.thread?.id || message.thread_id,
          parentMessage: data.parent_message || message,
        };
      });
      setThreadMessages(data.replies || []);
    } catch (err) {
      console.error("Failed to load thread:", err);
      setThreadError(err?.response?.data?.error || "Failed to load thread");
    } finally {
      setThreadLoading(false);
    }
  };


  const closeThreadPanel = () => {
    setActiveThread(null);
    setThreadMessages([]);
    setThreadInput("");
    setThreadError("");
    setThreadLoading(false);
    setThreadSending(false);
    setAlsoSendToChannel(false);
  };


  const sendThreadReply = async () => {
    if (!activeThread?.parentMessage?.id) return;
    if (!threadInput.trim()) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setThreadError("WebSocket not connected. Please wait...");
      return;
    }

    setThreadSending(true);
    const messageContent = threadInput.trim();
    const payload = {
      content: messageContent,
      reply_to: activeThread.parentMessage.id,
    };

    try {
      wsRef.current.send(JSON.stringify(payload));
      
      // If "also send to channel" is checked, send a regular message to the channel
      if (alsoSendToChannel) {
        const channelPayload = {
          content: messageContent,
        };
        wsRef.current.send(JSON.stringify(channelPayload));
      }
      
      setThreadInput("");
    } catch (err) {
      console.error("Failed to send thread reply:", err);
      setThreadError("Failed to send reply");
    } finally {
      setThreadSending(false);
    }
  };

  const handleThreadKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendThreadReply();
    }
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

  const handleSummarizeChat = async () => {
    if (summarizing) return;
    
    setSummarizing(true);
    setError("");
    
    try {
      const { data } = await api.post('chats/summarize/', {
        chat_type: 'project',
        chat_id: projectId,
        max_messages: 100 // Summarize up to 100 recent messages
      });
      
      setChatSummary(data);
      setShowSummary(true);
    } catch (err) {
      console.error("Failed to summarize chat:", err);
      setError(err?.response?.data?.error || "Failed to generate chat summary");
    } finally {
      setSummarizing(false);
    }
  };

  const closeSummary = () => {
    setShowSummary(false);
    setChatSummary(null);
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
                    className={`team-member-item ${member.accepted === false ? 'disabled' : ''}`}
                    onClick={() => member.accepted === false ? null : handleStartIndividualChat(member)}
                    title={member.accepted === false ? `Invitation pending` : `Chat with ${member.username}`}
                    disabled={member.accepted === false}
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
      <div className={`chat-main ${showSidebar ? "with-sidebar" : ""} ${activeThread ? "thread-open" : ""}`}>
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
            <p className="chat-subtitle">{activeSection === 'group' ? 'Group Chat' : 'AI Assistant'}</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                background: activeSection === 'group' ? '#667eea' : '#f3f4f6',
                color: activeSection === 'group' ? '#fff' : '#374151',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setActiveSection('group')}
            >
              Group Chat
            </button>
            <button
              style={{
                background: activeSection === 'ai' ? '#667eea' : '#f3f4f6',
                color: activeSection === 'ai' ? '#fff' : '#374151',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={() => setActiveSection('ai')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 15h8M9 9h6" />
              </svg>
              AI Chat
            </button>
            {activeSection === 'group' && (
              <button
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: summarizing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: summarizing ? 0.6 : 1,
                }}
                onClick={handleSummarizeChat}
                disabled={summarizing}
                title="Summarize chat using AI"
              >
                {summarizing ? (
                  <div className="send-spinner" style={{ width: 16, height: 16 }}></div>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                )}
                {summarizing ? 'Summarizing...' : 'Summarize'}
              </button>
            )}
          </div>
          {/* Search Bar (moved inside header) */}
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
      {error && activeSection === 'group' && (
        <div className="chat-error-banner">
          <span className="error-icon-small">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {}
      {activeSection === 'ai' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatToAI />
        </div>
      ) : (
        <>
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
                    threadId={msg.thread_id}
                    repliesCount={msg.replies_count}
                    onReply={() => handleReplyClick(msg)}
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
      </>
      )}

      {/* Close chat-main */}
      </div>

      {activeThread && (
        <ThreadPanel
          projectName={projectName}
          parentMessage={activeThread.parentMessage}
          replies={threadMessages}
          loading={threadLoading}
          error={threadError}
          onClose={closeThreadPanel}
          inputValue={threadInput}
          onInputChange={setThreadInput}
          onSend={sendThreadReply}
          onKeyDown={handleThreadKeyPress}
          sending={threadSending}
          wsConnected={wsConnected}
          currentUserId={currentUserId}
          alsoSendToChannel={alsoSendToChannel}
          onAlsoSendToChannelChange={setAlsoSendToChannel}
        />
      )}

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

      {}
      {showSummary && chatSummary && (
        <div className="summary-modal-overlay" onClick={closeSummary}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h3 className="summary-modal-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Chat Summary
              </h3>
              <button 
                className="summary-modal-close"
                onClick={closeSummary}
                aria-label="Close summary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="summary-modal-content">
              <div className="summary-info">
                <div className="summary-stat">
                  <span className="summary-stat-label">Chat Type:</span>
                  <span className="summary-stat-value">{chatSummary.chat_type}</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-stat-label">Project:</span>
                  <span className="summary-stat-value">{chatSummary.project_name}</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-stat-label">Messages Analyzed:</span>
                  <span className="summary-stat-value">{chatSummary.message_count}</span>
                </div>
              </div>
              <div className="summary-text">
                <h4>Summary:</h4>
                <div className="summary-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {chatSummary.summary}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
