import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ChatToAI = () => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const { projectId } = useParams();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: question.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('ai/query/', {
        project_id: projectId || 'my_project',
        query: userMessage.content,
        top_k: 20,
        token_budget: 800,
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.answer,
        context: data.context || [],
        timestamp: new Date().toISOString(),
      };

      setChatHistory(prev => [...prev, aiMessage]);
    } catch (err) {
      setError('Failed to get answer from AI. Please try again.');
      setChatHistory(prev => prev.slice(0, -1));
    } finally {1
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#f9fafb',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '16px 24px',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>AI Assistant</h2>
            <p style={{ fontSize: 13, margin: 0, opacity: 0.9 }}>Private chat - not visible to team</p>
          </div>
        </div>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 15h8M9 9h6" />
        </svg>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {chatHistory.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#9ca3af',
            textAlign: 'center',
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16, opacity: 0.5 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M8 15h8M9 9h6" />
            </svg>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px 0', color: '#6b7280' }}>Start a conversation with AI</h3>
            <p style={{ fontSize: 15, margin: 0 }}>Ask questions about your project, code, or get help with anything</p>
          </div>
        ) : (
          <>
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadeIn 0.3s ease-in',
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    background: msg.type === 'user' ? '#667eea' : '#fff',
                    color: msg.type === 'user' ? '#fff' : '#1f2937',
                    padding: '12px 16px',
                    borderRadius: msg.type === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    wordBreak: 'break-word',
                  }}
                >
                  <div style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {msg.type === 'ai' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.context && msg.context.length > 0 && (
                    <details style={{ marginTop: 12, fontSize: 13 }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#667eea' }}>
                        View {msg.context.length} source{msg.context.length !== 1 ? 's' : ''}
                      </summary>
                      <ul style={{ margin: '8px 0 0 0', padding: '0 0 0 16px' }}>
                        {msg.context.map((c, i) => (
                          <li key={c._id || i} style={{ marginTop: 6, color: '#6b7280' }}>
                            <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                              {c.source_path}
                            </code>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <span style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, paddingLeft: 8, paddingRight: 8 }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    background: '#fff',
                    padding: '12px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#667eea', animation: 'pulse 1.4s infinite' }}></div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#667eea', animation: 'pulse 1.4s infinite 0.2s' }}></div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#667eea', animation: 'pulse 1.4s infinite 0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 24px',
          margin: '0 24px',
          borderRadius: 8,
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        padding: '16px 24px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask AI anything about your project..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: 24,
              fontSize: 15,
              outline: 'none',
              transition: 'border 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            style={{
              background: loading || !question.trim() ? '#d1d5db' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 24,
              padding: '12px 28px',
              fontWeight: 600,
              fontSize: 15,
              cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {loading ? 'Thinking...' : 'Send'}
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </form>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default ChatToAI;
