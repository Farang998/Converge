import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../../../../services/api';
import './TeamCalendar.css';
import { useAuth } from '../../../../contexts/AuthContext';

const typeColors = {
  meeting: '#3b82f6', // blue
  task: '#10b981',    // emerald
};

const TeamCalendar = ({ projectId, token, isTeamLeader = false }) => {
  const [events, setEvents] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!projectId || !token) return;

    let mounted = true;

    async function loadMeetings() {
      try {
        // Only team leader should attempt sync; members may get 403 otherwise
        if (isTeamLeader) {
          try {
            await api.post(
              `/meetings/sync/`,
              { project_id: projectId },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          } catch (syncErr) {
            // Ignore 403 (Forbidden) so we still show existing meetings
            if (syncErr?.response?.status !== 403) {
              // eslint-disable-next-line no-console
              console.warn('Meetings sync failed:', syncErr?.response?.status || syncErr?.message);
            }
          }
        }

        const response = await api.get(`/meetings/?project_id=${projectId}`,
          { headers: { Authorization: `Bearer ${token}` } });

        const data = response.data || [];

        const meetingEvents = data.map((m) => ({
          id: m.id,
          title: m.title,
          start: m.start_time,
          end: m.end_time,
          backgroundColor: typeColors.meeting,
          borderColor: typeColors.meeting,
          extendedProps: {
            description: m.description,
            link: m.google_event_id
              ? `https://calendar.google.com/calendar/event?eid=${m.google_event_id}`
              : null,
            participants: m.attendees || [],
          },
        }));

        // Fetch tasks and overlay assignee's due dates
        let taskEvents = [];
        try {
          const tasksResp = await api.get(`/tasks/?project_id=${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const tasks = tasksResp.data || [];
          const myId = user?.id ? String(user.id) : null;
          if (myId) {
            taskEvents = tasks
              .filter((t) => Array.isArray(t.assigned_to) && t.assigned_to.some((u) => String(u.user_id) === myId))
              .filter((t) => !!t.due_date)
              .map((t) => ({
                id: `task-${t.id}`,
                title: `Task: ${t.name}`,
                start: t.due_date,
                end: t.due_date,
                backgroundColor: typeColors.task,
                borderColor: typeColors.task,
                extendedProps: {
                  description: t.description,
                  type: 'task',
                },
              }));
          }
        } catch (taskErr) {
          // eslint-disable-next-line no-console
          console.warn('Failed to load tasks for calendar overlay:', taskErr?.response?.status || taskErr?.message);
        }

        if (mounted) setEvents([...meetingEvents, ...taskEvents]);
      } catch (err) {
        console.error('Error loading meetings:', err);
        if (mounted) setEvents([]);
      }
    }

    loadMeetings();
    return () => {
      mounted = false;
    };
  }, [projectId, token]);

  const handleEventDidMount = (info) => {
    info.el.style.borderRadius = '6px';
  };

  return (
    <div className="team-calendar-wrapper">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        eventDidMount={handleEventDidMount}
      />
    </div>
  );
};

export default TeamCalendar;
