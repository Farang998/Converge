import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import './Notifications.css';
import { FaBell, FaCheck, FaTimes, FaArrowLeft, FaSync } from 'react-icons/fa';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('notifications/');
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    if (processingIds.has(notificationId)) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(notificationId));
      await api.post(`notifications/mark-as-read/${notificationId}/`);
      
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const extractProjectId = (linkUrl) => {
    if (!linkUrl) return null;
    const match = linkUrl.match(/\/projects\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const handleAcceptInvitation = async (notification) => {
    const projectId = extractProjectId(notification.link_url);
    
    if (!projectId) {
      toast.error('Invalid invitation link');
      return;
    }

    if (processingIds.has(notification.id)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(notification.id));
      
      // Accept the invitation
      const acceptResponse = await api.get(`projects/accept-invitation/${projectId}/`);
      toast.success(acceptResponse.data.message || 'Invitation accepted successfully!');
      
      // Mark notification as read
      await markAsRead(notification.id);
      
      // Refresh notifications
      setTimeout(() => {
        fetchNotifications();
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // If it's an invitation, show accept/decline options
    if (notification.message.includes('invited to join')) {
      return; // Don't navigate, let the user use accept button
    }

    // Otherwise, navigate to the link if available
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  const isInvitation = (message) => {
    return message && message.toLowerCase().includes('invited to join');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="header-content">
          <div className="header-title">
            <FaBell className="header-icon" />
            <h1>Notifications</h1>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          <button className="refresh-button" onClick={fetchNotifications} disabled={loading}>
            <FaSync className={loading ? 'spinning' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="notifications-container">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="empty-state">
            <FaBell className="empty-icon" />
            <h2>No notifications</h2>
            <p>You're all caught up! Check back later for updates.</p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="notifications-list">
            {notifications.map((notification) => {
              const isInvite = isInvitation(notification.message);
              const projectId = extractProjectId(notification.link_url);
              const isProcessing = processingIds.has(notification.id);
              const date = new Date(notification.created_at);
              const timeAgo = getTimeAgo(date);

              return (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'} ${isInvite ? 'invitation' : ''}`}
                  onClick={() => !isInvite && handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <div className="notification-header-row">
                      <div className="notification-message">
                        {!notification.read && <span className="unread-indicator"></span>}
                        <p>{notification.message}</p>
                      </div>
                      <span className="notification-time">{timeAgo}</span>
                    </div>

                    {isInvite && projectId && (
                      <div className="invitation-actions">
                        <button
                          className="accept-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptInvitation(notification);
                          }}
                          disabled={isProcessing}
                        >
                          <FaCheck /> {isProcessing ? 'Accepting...' : 'Accept Invitation'}
                        </button>
                        <button
                          className="decline-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                            toast.info('Invitation declined');
                          }}
                          disabled={isProcessing}
                        >
                          <FaTimes /> Decline
                        </button>
                      </div>
                    )}

                    {notification.link_url && !isInvite && (
                      <div className="notification-link">
                        <span className="link-text">Click to view</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

export default Notifications;

