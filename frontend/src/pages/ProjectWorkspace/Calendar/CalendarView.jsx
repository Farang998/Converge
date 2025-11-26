import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import { toast } from 'react-toastify';
import './Calendar.css';
import { FaCalendarAlt, FaGoogle, FaLink, FaSpinner, FaPlus } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
// import TeamCalendar from './TeamCalendar/TeamCalendar';

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
  const [creatingCalendar, setCreatingCalendar] = useState(false);

  const token = localStorage.getItem("authToken");

  const fetchProjectById = async (id) => {
    console.log("[CAL DEBUG] Fetching project directly:", id);

    try {
      const response = await api.get(`projects/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });


      const project = response.data;
      console.log("[CAL DEBUG] Project response:", project);

      // Calendar ID
      setProjectCalendarId(project?.calendar_id || null);
      console.log("[CAL DEBUG] projectCalendarId =", project?.calendar_id);

      // Team leader check
      const leaderId =
        project.team_leader?.user_id ||
        project.team_leader?.id ||
        project.team_leader;

      const isLeader = String(leaderId) === String(user.id);
      console.log("[CAL DEBUG] isTeamLeader =", isLeader);
      setIsTeamLeader(isLeader);

      // If team member → handle calendar
      if (!isLeader) {
        if (project.calendar_id) {
          console.log("[CAL DEBUG] Member fetching events...");
          await fetchCalendarEvents(id, { isInitial: true });
        } else {
          console.log("[CAL DEBUG] Member: no calendar found.");
          setCheckingConnection(false);
        }
      }

    } catch (err) {
      console.error("[CAL DEBUG] Error fetching project:", err);
    } finally {
      setProjectLoaded(true);
      if (!isTeamLeader) setCheckingConnection(false);
    }
  };

  
  useEffect(() => {
    if (projectId) {
      console.log("[CAL DEBUG] Calling fetchProjectById");
      fetchProjectById(projectId);

      if (isTeamLeader) {
        fetchCalendarEvents(projectId, { isInitial: true });
      }
    } else {
      setCheckingConnection(false);
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) handleOAuthCallback(code, state);

  }, [projectId, isTeamLeader]);

  
  useEffect(() => {
    if (projectId && isConnected && isTeamLeader) {
      fetchCalendarEvents(projectId);
    }
    // eslint-disable-next-line
  }, [isConnected]);

  // -----------------------------
  // Create project Google Calendar
  // -----------------------------
  const createProjectCalendar = async () => {
    try {
      setCreatingCalendar(true);
      const resp = await api.post(`calendar/project/${projectId}/create/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newId = resp.data?.calendar_id;
      if (newId) {
        toast.success('Project Google Calendar created');
        setProjectCalendarId(newId);
        await fetchCalendarEvents(projectId);
      } else {
        toast.error('Failed to create calendar');
      }
    } catch (err) {
      console.error('Error creating project calendar:', err);
      toast.error(err.response?.data?.error || 'Failed to create Google Calendar');
    } finally {
      setCreatingCalendar(false);
    }
  };

  // -----------------------------
  // Google OAuth init
  // -----------------------------
  const connectGoogleCalendar = async () => {
    try {
      setConnecting(true);

      if (!token) {
        toast.error('Please log in first');
        navigate('/login');
        return;
      }

      const response = await api.get('calendar/auth/init/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.auth_url) {
        window.location.href = response.data.auth_url;
      } else {
        toast.error('Failed to initiate Google Calendar connection');
      }
    } catch (err) {
      console.error('Error initiating Google Calendar connection:', err);
      toast.error(err.response?.data?.error || 'Failed to connect Google Calendar');
      setConnecting(false);
    }
  };

  // -----------------------------
  // Google OAuth callback handler
  // -----------------------------
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
    } catch (err) {
      console.error('Error handling OAuth callback:', err);
      toast.error(err.response?.data?.error || 'Failed to complete Google Calendar connection');
    } finally {
      setConnecting(false);
    }
  };

  // -----------------------------
  // Fetch events from Google Calendar
  // -----------------------------
  const fetchCalendarEvents = async (id, { isInitial = false } = {}) => {
    try {
      if (!isInitial) setLoadingEvents(true);

      const response = await api.get(`calendar/project/${id}/events/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

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
          status: event.status || 'confirmed'
        };
      });

      formatted.sort((a, b) => (!a.start ? 1 : !b.start ? -1 : a.start - b.start));

      setEvents(formatted);
      setIsConnected(true);
    } catch (error) {
      console.error('Error fetching Google events:', error);

      if (error.response?.status === 400 &&
          error.response?.data?.error?.includes('not connected')) {
        setIsConnected(false);
      } else {
        setEvents([]);
      }
    } finally {
      if (!isInitial) setLoadingEvents(false);
      setCheckingConnection(false);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="calendar-page">
      <div className="calendar-container">

        {/* ----------------- Loading State ----------------- */}
        {checkingConnection && (
          <div className="loading-state">
            <FaSpinner className="spinner" />
            <p>Checking connection...</p>
          </div>
        )}

        {/* ----------------- Team member view ----------------- */}
        {!checkingConnection && !isTeamLeader && (
          <>
            {projectCalendarId ? (
              <>
                {loadingEvents && (
                  <div className="loading-state">
                    <FaSpinner className="spinner" />
                    <p>Loading calendar events...</p>
                  </div>
                )}
                {!loadingEvents && events.length === 0 && (
                  <div className="empty-state">
                    <FaCalendarAlt className="empty-icon" />
                    <h2>No events scheduled</h2>
                    <p>This project's Google Calendar is empty.</p>
                  </div>
                )}
                {!loadingEvents && events.length > 0 && (
                  <div className="events-section">
                    <h2 className="events-title">Upcoming Events</h2>
                    <div className="events-list">
                      {events.map((event) => (
                        <div key={event.id} className="event-card">
                          <h3>{event.summary}</h3>
                          <p>{event.description}</p>
                          <p><strong>Start:</strong> {event.start?.toString()}</p>
                          {event.htmlLink && (
                            <button onClick={() => window.open(event.htmlLink, "_blank")}>
                              <FaLink /> View in Google Calendar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <FaCalendarAlt className="empty-icon" />
                <h2>No team calendar</h2>
                <p>Your project team does not have a Google Calendar.</p>
              </div>
            )}
          </>
        )}

        {/* ----------------- Team leader: Not connected ----------------- */}
        {!checkingConnection && isTeamLeader && !isConnected && (
          <div className="connection-prompt">
            <div className="prompt-content">
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
            </div>
          </div>
        )}

        {/* ----------------- Team leader: Connected but no calendar yet ----------------- */}
        {!checkingConnection && isTeamLeader && isConnected && !projectCalendarId && (
          <div className="connection-prompt">
            <div className="prompt-content">
              <FaCalendarAlt className="google-icon" />
              <h2>Create a Project Calendar</h2>
              <p>Create a dedicated Google Calendar for this project.</p>
              <button className="connect-button" onClick={createProjectCalendar} disabled={creatingCalendar}>
                {creatingCalendar ? (
                  <>
                    <FaSpinner className="button-spinner" /> Creating...
                  </>
                ) : (
                  <>
                    <FaPlus /> Create Project Calendar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ----------------- Team leader: Google Calendar connected with calendar ----------------- */}
        {!checkingConnection && isTeamLeader && isConnected && projectCalendarId && (
          <>
            <div className="calendar-controls">
              {projectCalendarId && (
                <a
                  href={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(projectCalendarId)}`}
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

            {!loadingEvents && events.length === 0 && (
              <div className="empty-state">
                <FaCalendarAlt className="empty-icon" />
                <h2>No events scheduled</h2>
                <p>This project's Google Calendar is empty.</p>
              </div>
            )}

            {!loadingEvents && events.length > 0 && (
              <div className="events-section">
                <h2 className="events-title">Upcoming Events</h2>

                <div className="events-list">
                  {events.map((event) => (
                    <div key={event.id} className="event-card">
                      <h3>{event.summary}</h3>
                      <p>{event.description}</p>
                      <p><strong>Start:</strong> {event.start?.toString()}</p>

                      {event.htmlLink && (
                        <button onClick={() => window.open(event.htmlLink, "_blank")}>
                          <FaLink /> View in Google Calendar
                        </button>
                      )}
                    </div>
                  ))}
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
