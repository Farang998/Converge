import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import { toast } from 'react-toastify';
import './Calendar.css';
import { FaCalendarAlt, FaGoogle, FaLink, FaSpinner, FaPlus, FaSync } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import TeamCalendar from './TeamCalendar/TeamCalendar';

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
  const [syncingMeetings, setSyncingMeetings] = useState(false);

  const token = localStorage.getItem('authToken');

  // -----------------------------
  // Helper: fetch credentials status
  // -----------------------------
  const fetchCredentialsStatus = useCallback(async () => {
    if (!token) {
      setIsConnected(false);
      return { connected: false };
    }
    try {
      const resp = await api.get('calendar/credentials/status/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = resp.data || {};
      setIsConnected(Boolean(data.connected));
      return data;
    } catch (err) {
      console.error('[CAL DEBUG] fetchCredentialsStatus error:', err);
      setIsConnected(false);
      return { connected: false };
    }
  }, [token]);

  // -----------------------------
  // Helper: fetch project info
  // -----------------------------
  const fetchProjectById = useCallback(
    async (id) => {
      if (!id) return null;
      try {
        const response = await api.get(`projects/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const project = response.data;
        setProjectCalendarId(project?.calendar_id || null);

        const leaderId =
          project.team_leader?.user_id ||
          project.team_leader?.id ||
          project.team_leader;

        const leaderMatch = String(leaderId) === String(user?.id);
        setIsTeamLeader(Boolean(leaderMatch));

        return project;
      } catch (err) {
        console.error('[CAL DEBUG] Error fetching project:', err);
        toast.error('Failed to load project');
        return null;
      } finally {
        setProjectLoaded(true);
      }
    },
    [token, user?.id]
  );

  // -----------------------------
  // Events loader (safe: backend handles fallback to leader creds)
  // -----------------------------
  const fetchCalendarEvents = useCallback(
    async (id, { isInitial = false } = {}) => {
      if (!id) return;
      try {
        if (!isInitial) setLoadingEvents(true);

        const response = await api.get(`calendar/project/${id}/events/`, {
          headers: { Authorization: `Bearer ${token}` },
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
            status: event.status || 'confirmed',
          };
        });

        formatted.sort((a, b) => (!a.start ? 1 : !b.start ? -1 : a.start - b.start));

        setEvents(formatted);
      } catch (error) {
        console.error('[CAL DEBUG] Error fetching Google events:', error);
        // If backend returns an explicit "not connected" style message, mark disconnected
        if (error.response?.status === 400 && typeof error.response?.data?.error === 'string') {
          if (error.response.data.error.toLowerCase().includes('not connected')) {
            setIsConnected(false);
          }
        }
        setEvents([]);
      } finally {
        if (!isInitial) setLoadingEvents(false);
        setCheckingConnection(false);
      }
    },
    [token]
  );

  // -----------------------------
  // OAuth callback handler
  // -----------------------------
  const handleOAuthCallback = useCallback(
    async (code, state) => {
      if (!code || !state) return false;
      try {
        setConnecting(true);
        const response = await api.get(`calendar/auth/callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
        if (response.status === 200) {
          toast.success('Google Calendar connected successfully!');
          // update connected state
          await fetchCredentialsStatus();
          // remove query params from URL cleanly
          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        }
      } catch (err) {
        console.error('[CAL DEBUG] handleOAuthCallback error:', err);
        toast.error(err.response?.data?.error || 'Failed to complete Google Calendar connection');
      } finally {
        setConnecting(false);
      }
      return false;
    },
    [fetchCredentialsStatus]
  );

  // -----------------------------
  // Create project calendar (leader only)
  // -----------------------------
  const createProjectCalendar = useCallback(async () => {
    if (!projectId) return;
    try {
      setCreatingCalendar(true);
      const resp = await api.post(`calendar/project/${projectId}/create/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newId = resp.data?.calendar_id;
      if (newId) {
        toast.success('Project Google Calendar created');
        setProjectCalendarId(newId);
        // load events after calendar creation
        await fetchCalendarEvents(projectId);
      } else {
        toast.error('Failed to create calendar');
      }
    } catch (err) {
      console.error('[CAL DEBUG] Error creating project calendar:', err);
      toast.error(err.response?.data?.error || 'Failed to create Google Calendar');
    } finally {
      setCreatingCalendar(false);
    }
  }, [projectId, token, fetchCalendarEvents]);

  // -----------------------------
  // Sync meetings
  // -----------------------------
  const syncMeetingsFromGoogle = useCallback(async () => {
    if (!projectId) return;
    try {
      setSyncingMeetings(true);
      await api.post(
        `meetings/sync/`,
        { project_id: projectId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Synced meetings from Google');
    } catch (err) {
      console.error('[CAL DEBUG] syncMeetingsFromGoogle error:', err);
      const msg = err?.response?.data?.error || 'Failed to sync meetings';
      toast.error(msg);
    } finally {
      setSyncingMeetings(false);
    }
  }, [projectId, token]);

  // -----------------------------
  // Connect Google (redirect to Google OAuth)
  // -----------------------------
  const connectGoogleCalendar = useCallback(async () => {
    if (!token) {
      toast.error('Please log in first');
      navigate('/login');
      return;
    }
    try {
      setConnecting(true);
      const response = await api.get('calendar/auth/init/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.auth_url) {
        window.location.href = response.data.auth_url;
      } else {
        toast.error('Failed to initiate Google Calendar connection');
        setConnecting(false);
      }
    } catch (err) {
      console.error('[CAL DEBUG] connectGoogleCalendar error:', err);
      toast.error(err.response?.data?.error || 'Failed to connect Google Calendar');
      setConnecting(false);
    }
  }, [token, navigate]);

  // -----------------------------
  // Init flow (single, sequential)
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setCheckingConnection(true);

      // 1) If OAuth query params exist -> handle them first (this will create credentials)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      // If callback exists, process it first
      if (code && state) {
        await handleOAuthCallback(code, state);
      }

      // 2) Check credentials status (after callback handling)
      await fetchCredentialsStatus();

      // 3) Fetch project info
      if (projectId) {
        await fetchProjectById(projectId);

        // If this user is a team member and project already has a calendar, fetch events
        // If team leader, only fetch events if connected and calendar exists.
        if (!mounted) return;

        if (!isTeamLeader && projectCalendarId) {
          await fetchCalendarEvents(projectId, { isInitial: true });
        } else if (isTeamLeader && projectCalendarId && isConnected) {
          // if leader and connected and calendar exists -> fetch events
          await fetchCalendarEvents(projectId, { isInitial: true });
        }
      }

      // final clean-up ui flags
      if (mounted) {
        setCheckingConnection(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
    // purposely run once on mount (lint disabled on dependencies to keep single-shot init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // If credentials change (user connected after some action elsewhere), optionally refresh events:
  useEffect(() => {
    // If we just became connected AND there is a project calendar, load events
    if (isConnected && projectId && projectCalendarId) {
      fetchCalendarEvents(projectId);
    }
  }, [isConnected, projectId, projectCalendarId, fetchCalendarEvents]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="calendar-page">
      <div className="calendar-container">

        {checkingConnection && (
          <div className="loading-state">
            <FaSpinner className="spinner" />
            <p>Checking connection...</p>
          </div>
        )}

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
                {!loadingEvents && (
                  <TeamCalendar projectId={projectId} token={token} />
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
              <button
                className="google-calendar-link"
                onClick={syncMeetingsFromGoogle}
                disabled={syncingMeetings}
                style={{ marginLeft: 12 }}
              >
                {syncingMeetings ? (
                  <>
                    <FaSpinner className="button-spinner" /> Syncing...
                  </>
                ) : (
                  <>
                    <FaSync /> Sync Meetings from Google
                  </>
                )}
              </button>
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