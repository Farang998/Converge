  import React, { useState, useEffect } from 'react';
  import { useNavigate, useParams } from 'react-router-dom';
  import api from '../../../services/api';
  import { toast } from 'react-toastify';
  import './Calendar.css';
  import { FaCalendarAlt, FaGoogle, FaLink, FaSpinner } from 'react-icons/fa';
  import { useAuth } from '../../../contexts/AuthContext';

  const Calendar = () => {
    const navigate = useNavigate();
    const { projectId } = useParams();
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [checkingConnection, setCheckingConnection] = useState(true);
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [projectCalendarId, setProjectCalendarId] = useState(null);
    const [projectLoaded, setProjectLoaded] = useState(false);
    const [isTeamLeader, setIsTeamLeader] = useState(false);

    useEffect(() => {
      // Load project details (calendar_id)
      if (projectId) {
        fetchProjectDetails(projectId);
        fetchCalendarEvents(projectId, { isInitial: true });
      } else {
        setCheckingConnection(false);
      }

      // Handle OAuth callback if present
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      if (code && state) {
        handleOAuthCallback(code, state);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    useEffect(() => {
      if (projectId && isConnected) {
        fetchCalendarEvents(projectId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected]);

    const fetchProjectDetails = async (id) => {
      try {
        const response = await api.get('projects/');
        const projectsData = response.data || [];
        const current = projectsData.find((p) => p.id === id);
        setProjectCalendarId(current?.calendar_id || null);
        if (current && user?.id) {
          const leaderId = current.team_leader?.user_id || current.team_leader?.id || current.team_leader;
          setIsTeamLeader(String(leaderId) === String(user.id));
        } else {
          setIsTeamLeader(false);
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
      } finally {
        setProjectLoaded(true);
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
          window.history.replaceState({}, document.title, window.location.pathname);
          if (projectId) {
            fetchProjectDetails(projectId);
            fetchCalendarEvents(projectId);
          }
        }
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
        toast.error(error.response?.data?.error || 'Failed to complete Google Calendar connection');
      } finally {
        setConnecting(false);
      }
    };

    const fetchCalendarEvents = async (id, { isInitial = false } = {}) => {
      try {
        if (!isInitial) setLoadingEvents(true);
        const response = await api.get(`calendar/project/${id}/events/`);
        const eventsData = response.data?.events || [];

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

        formatted.sort((a, b) => {
          if (!a.start) return 1;
          if (!b.start) return -1;
          return a.start - b.start;
        });

        setEvents(formatted);
        setIsConnected(true);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        if (error.response?.status === 400 && error.response?.data?.error?.includes('not connected')) {
          setIsConnected(false);
          toast.error('Google Calendar not connected. Please connect your Google account.');
        } else if (error.response?.status === 400 && error.response?.data?.error?.includes('calendar_id')) {
          setEvents([]);
          setIsConnected(true);
        } else {
          toast.error('Failed to load calendar events');
          setEvents([]);
        }
      } finally {
        if (!isInitial) setLoadingEvents(false);
        setCheckingConnection(false);
      }
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

    return (
      <div className="calendar-page">
        <div className="calendar-header">
          <div className="header-content">
            <div className="header-title">
              <FaCalendarAlt className="header-icon" />
              <h1>Calendar</h1>
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

          {!checkingConnection && (!isConnected || (isConnected && !projectCalendarId)) && (
            <div className="connection-prompt">
              <div className="prompt-content">
                {!isTeamLeader ? (
                  <>
                    <FaCalendarAlt className="google-icon" />
                    <h2>Project Calendar</h2>
                    <p>Team member calendar is coming soon. You’ll be able to view the leader-managed project calendar here.</p>
                  </>
                ) : (
                  <>
                    <FaGoogle className="google-icon" />
                    <h2>Connect Google Calendar</h2>
                    <p>Connect your Google Calendar to create and manage this project's events.</p>
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
                  </>
                )}
              </div>
            </div>
          )}

          {!checkingConnection && isConnected && (
            <>
              <div className="calendar-controls">
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
              {loadingEvents && (
                <div className="loading-state">
                  <FaSpinner className="spinner" />
                  <p>Loading calendar events...</p>
                </div>
              )}

              {!loadingEvents && projectCalendarId && events.length === 0 && (
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
                                  {event.attendees.map((a) => a.email || a.displayName || 'Unknown').join(', ')}
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

