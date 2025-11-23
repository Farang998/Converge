import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../../../../services/api';
import './TeamCalendar.css';

const typeColors = {
  meeting: '#3b82f6',
};

const TeamCalendar = ({ projectId, token }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!projectId || !token) return;

    let mounted = true;

    async function loadMeetings() {
      try {
        const response = await api.get(`/meetings/?project_id=${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data || [];

        const mapped = data.map((m) => ({
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

        if (mounted) setEvents(mapped);
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
