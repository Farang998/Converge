import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { toast } from 'react-toastify';
import './Calendar.css';
import { FaCalendarAlt, FaArrowLeft, FaGoogle, FaLink, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

const Calendar = () => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [projectCalendarId, setProjectCalendarId] = useState(null);

  useEffect(() => {
    checkConnection();
    fetchProjects();
    
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId && isConnected) {
      fetchCalendarEvents(selectedProjectId);
    } else {
      setEvents([]);
    }
  }, [selectedProjectId, isConnected]);

  const checkConnection = async () => {
    try {
      setCheckingConnection(true);
      // Try to fetch events from any project to check connection
      // If we get a "not connected" error, user needs to connect
      const response = await api.get('projects/');
      const projectsData = response.data || [];
      
      if (projectsData.length > 0) {
        // Try to get events from first project to check connection
        try {
          const testResponse = await api.get(`calendar/project/${projectsData[0].id}/events/`);
          setIsConnected(true);
        } catch (error) {
          if (error.response?.status === 400 && error.response?.data?.error?.includes('not connected')) {
            setIsConnected(false);
          } else {
            // Project might not have calendar_id, but user might be connected
            setIsConnected(true);
          }
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('projects/');
      const projectsData = response.data || [];
      
      const formatted = projectsData.map((project) => ({
        id: project.id,
        name: project.name,
        calendar_id: project.calendar_id,
        description: project.description || '',
      }));
      
      setProjects(formatted);
      
      if (formatted.length > 0) {
        setSelectedProjectId(formatted[0].id);
        setProjectCalendarId(formatted[0].calendar_id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      setConnecting(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        toast.error('Please log in first');
        navigate('/login');
        return;
      }

      const response = await api.get('calendar/auth/init/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data?.auth_url) {
        // Open OAuth flow in same window
        window.location.href = response.data.auth_url;
      } else {
        toast.error('Failed to initiate Google Calendar connection');
      }
    } catch (error) {
      console.error('Error initiating Google Calendar connection:', error);
      toast.error(error.response?.data?.error || 'Failed to connect Google Calendar');
      setConnecting(false);
    }
  };

  const handleOAuthCallback = async (code, state) => {
    try {
      setConnecting(true);
      
      const response = await api.get(`calendar/auth/callback/?code=${code}&state=${state}`);
      
      if (response.status === 200) {
        toast.success('Google Calendar connected successfully!');
        setIsConnected(true);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Refresh projects to get updated calendar_id
        fetchProjects();
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      toast.error(error.response?.data?.error || 'Failed to complete Google Calendar connection');
    } finally {
      setConnecting(false);
    }
  };

  const fetchCalendarEvents = async (projectId) => {
    if (!projectId) return;
    
    try {
      setLoadingEvents(true);
      const response = await api.get(`calendar/project/${projectId}/events/`);
      
      const eventsData = response.data?.events || [];
      
      // Format events for display
      const formatted = eventsData.map((event) => {
        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        
        return {
          id: event.id,
          summary: event.summary || 'No title',
          description: event.description || '',
          start: start ? new Date(start) : null,
          end: end ? new Date(end) : null,
          htmlLink: event.htmlLink || null,
          location: event.location || '',
          attendees: event.attendees || [],
          status: event.status || 'confirmed',
        };
      });
      
      // Sort by start date
      formatted.sort((a, b) => {
        if (!a.start) return 1;
        if (!b.start) return -1;
        return a.start - b.start;
      });
      
      setEvents(formatted);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      if (error.response?.status === 400 && error.response?.data?.error?.includes('not connected')) {
        setIsConnected(false);
        toast.error('Google Calendar not connected. Please connect your Google account.');
      } else if (error.response?.status === 400 && error.response?.data?.error?.includes('calendar_id')) {
        // Project doesn't have a calendar yet
        setEvents([]);
      } else {
        toast.error('Failed to load calendar events');
        setEvents([]);
      }
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    setSelectedProjectId(projectId);
    
    const selectedProject = projects.find(p => p.id === projectId);
    setProjectCalendarId(selectedProject?.calendar_id || null);
  };

  const formatDateTime = (date) => {
    if (!date) return 'No date';
    
    const now = new Date();
    const eventDate = new Date(date);
    const isToday = eventDate.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today at ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    return eventDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getGoogleCalendarLink = (calendarId) => {
    if (!calendarId) return null;
    return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`;
  };

  const openEventInGoogleCalendar = (htmlLink) => {
    if (htmlLink) {
      window.open(htmlLink, '_blank');
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="header-content">
          <div className="header-title">
            <FaCalendarAlt className="header-icon" />
            <h1>Calendar</h1>
            {checkingConnection ? (
              <FaSpinner className="connection-spinner" />
            ) : isConnected ? (
              <FaCheckCircle className="connection-icon connected" />
            ) : (
              <FaTimesCircle className="connection-icon disconnected" />
            )}
          </div>
        </div>
      </div>

      <div className="calendar-container">
        {checkingConnection && (
          <div className="loading-state">
            <FaSpinner className="spinner" />
            <p>Checking connection...</p>
          </div>
        )}

        {!checkingConnection && !isConnected && (
          <div className="connection-prompt">
            <div className="prompt-content">
              <FaGoogle className="google-icon" />
              <h2>Connect Google Calendar</h2>
              <p>Connect your Google Calendar to view and manage project events.</p>
              <button
                className="connect-button"
                onClick={connectGoogleCalendar}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <FaSpinner className="button-spinner" /> Connecting...
                  </>
                ) : (
                  <>
                    <FaGoogle /> Connect Google Calendar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {!checkingConnection && isConnected && (
          <>
            <div className="calendar-controls">
              <div className="project-selector">
                <label htmlFor="project-select">Select Project:</label>
                <select
                  id="project-select"
                  value={selectedProjectId || ''}
                  onChange={handleProjectChange}
                  className="project-select"
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {projectCalendarId && (
                <a
                  href={getGoogleCalendarLink(projectCalendarId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="google-calendar-link"
                >
                  <FaLink /> Open in Google Calendar
                </a>
              )}
            </div>

            {selectedProject && !projectCalendarId && (
              <div className="info-message">
                <p>This project doesn't have a calendar yet. Calendar events will appear here once the project calendar is created.</p>
              </div>
            )}

            {loadingEvents && (
              <div className="loading-state">
                <FaSpinner className="spinner" />
                <p>Loading calendar events...</p>
              </div>
            )}

            {!loadingEvents && selectedProject && projectCalendarId && events.length === 0 && (
              <div className="empty-state">
                <FaCalendarAlt className="empty-icon" />
                <h2>No events scheduled</h2>
                <p>There are no events in this project's calendar yet.</p>
                <a
                  href={getGoogleCalendarLink(projectCalendarId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="google-calendar-link-button"
                >
                  <FaLink /> Add events in Google Calendar
                </a>
              </div>
            )}

            {!loadingEvents && events.length > 0 && (
              <div className="events-section">
                <h2 className="events-title">Upcoming Events</h2>
                <div className="events-list">
                  {events.map((event) => {
                    const isPast = event.end && new Date(event.end) < new Date();
                    
                    return (
                      <div
                        key={event.id}
                        className={`event-card ${isPast ? 'past' : ''} ${event.status === 'cancelled' ? 'cancelled' : ''}`}
                      >
                        <div className="event-header">
                          <h3 className="event-title">{event.summary}</h3>
                          {event.status === 'cancelled' && (
                            <span className="cancelled-badge">Cancelled</span>
                          )}
                          {isPast && event.status !== 'cancelled' && (
                            <span className="past-badge">Past</span>
                          )}
                        </div>

                        <div className="event-details">
                          <div className="event-detail-item">
                            <span className="detail-label">Start:</span>
                            <span className="detail-value">{formatDateTime(event.start)}</span>
                          </div>
                          {event.end && (
                            <div className="event-detail-item">
                              <span className="detail-label">End:</span>
                              <span className="detail-value">{formatDateTime(event.end)}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="event-detail-item">
                              <span className="detail-label">Location:</span>
                              <span className="detail-value">{event.location}</span>
                            </div>
                          )}
                          {event.description && (
                            <div className="event-detail-item description">
                              <span className="detail-label">Description:</span>
                              <p className="detail-value">{event.description}</p>
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="event-detail-item">
                              <span className="detail-label">Attendees:</span>
                              <span className="detail-value">
                                {event.attendees.map(a => a.email || a.displayName || 'Unknown').join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {event.htmlLink && (
                          <button
                            className="view-in-google-button"
                            onClick={() => openEventInGoogleCalendar(event.htmlLink)}
                          >
                            <FaLink /> View in Google Calendar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Calendar;

