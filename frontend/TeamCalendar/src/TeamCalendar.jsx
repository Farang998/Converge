import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './TeamCalendar.css';

const mockEvents = [
  {
    id: 'evt_project_created_1',
    type: 'project_creation',
    title: 'Project Created',
    description: 'Initial project setup completed.',
    start: '2025-11-16T09:00:00Z',
    end: '2025-11-16T09:30:00Z',
    link: '/projects/evt_project_created_1'
  },
  {
    id: 'evt_task_deadline_9a3d',
    type: 'task_deadline',
    title: 'Task Deadline: UI Design',
    description: 'UI design must be completed by EOD.',
    start: '2025-11-20T23:59:00Z',
    end: '2025-11-21T00:30:00Z',
    link: '/tasks/evt_task_deadline_9a3d'
  },
  {
    id: 'evt_task_completed_44b1',
    type: 'task_completed',
    title: 'Task Completed: API Integration',
    description: 'Completed by Anushka.',
    start: '2025-11-19T14:20:00Z',
    end: '2025-11-19T14:50:00Z',
    link: '/tasks/evt_task_completed_44b1'
  },
  {
    id: 'evt_meeting_7fa2',
    type: 'meeting',
    title: 'Team Sync Meeting',
    description: 'Daily standup meeting',
    start: '2025-11-18T10:00:00Z',
    end: '2025-11-18T10:30:00Z',
    link: 'https://meet.goo//jdkkjals',
    participants: ['user123', 'user456', 'user789']
  },
  {
    id: 'evt_task_completed_55c2',
    type: 'task_completed',
    title: 'Task Completed: Database Setup',
    description: 'Database schema created and initialized.',
    start: '2025-11-19T10:15:00Z',
    end: '2025-11-19T10:45:00Z',
    link: '/tasks/evt_task_completed_55c2'
  },
  {
    id: 'evt_task_deadline_2b4e',
    type: 'task_deadline',
    title: 'Task Deadline: Backend Testing',
    description: 'Complete backend unit tests.',
    start: '2025-11-18T16:30:00Z',
    end: '2025-11-18T17:00:00Z',
    link: '/tasks/evt_task_deadline_2b4e'
  },
  {
    id: 'evt_meeting_8gb3',
    type: 'meeting',
    title: 'Code Review Session',
    description: 'Review pull requests and discuss improvements',
    start: '2025-11-18T14:00:00Z',
    end: '2025-11-18T14:30:00Z',
    link: 'https://meet.google.com/abc123',
    participants: ['user123', 'user999']
  },
  {
    id: 'evt_project_created_2',
    type: 'project_creation',
    title: 'New Feature Module Started',
    description: 'Feature module initialization.',
    start: '2025-11-20T11:00:00Z',
    end: '2025-11-20T11:30:00Z',
    link: '/projects/evt_project_created_2'
  }
];

const typeColors = {
  project_creation: '#f97316',
  task_deadline: '#ef4444',
  task_completed: '#22c55e',
  meeting: '#3b82f6'
};

const TeamCalendar = () => {
  const events = useMemo(
    () =>
      mockEvents.map(evt => ({
        ...evt,
        backgroundColor: typeColors[evt.type] || '#6366f1',
        borderColor: typeColors[evt.type] || '#6366f1',
        extendedProps: {
          description: evt.description,
          type: evt.type,
          link: evt.link,
          participants: evt.participants || []
        }
      })),
    []
  );

  const renderTooltip = info => {
    const { description, type, link, participants } = info.event.extendedProps;
    const typeLabel =
      type === 'project_creation'
        ? 'Project'
        : type === 'task_deadline'
        ? 'Task Deadline'
        : type === 'task_completed'
        ? 'Task Completed'
        : 'Meeting';
    const participantLabel =
      participants && participants.length
        ? `<div><strong>Participants:</strong> ${participants.join(', ')}</div>`
        : '';
    
    // Remove any existing tooltip
    const existingTooltip = document.querySelector('.calendar-tooltip');
    if (existingTooltip) existingTooltip.remove();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'calendar-tooltip';
    tooltip.innerHTML = `
      <div><strong>${typeLabel}</strong></div>
      <div>${description}</div>
      ${participantLabel}
      <a href="${link}" target="_blank" rel="noopener noreferrer">View details</a>
    `;
    document.body.appendChild(tooltip);
    
    // Position tooltip after rendering
    requestAnimationFrame(() => {
      const rect = info.el.getBoundingClientRect();
      const tooltipHeight = tooltip.offsetHeight;
      tooltip.style.position = 'fixed';
      tooltip.style.top = (rect.top - tooltipHeight - 8) + 'px';
      tooltip.style.left = rect.left + 'px';
      tooltip.style.pointerEvents = 'auto';
    });
    
    let hideTimeout;
    const startHideTimer = () => {
      hideTimeout = setTimeout(() => tooltip.remove(), 300);
    };
    
    const cancelHideTimer = () => {
      clearTimeout(hideTimeout);
    };
    
    info.el.addEventListener('mouseleave', startHideTimer);
    info.el.addEventListener('mouseenter', cancelHideTimer);
    tooltip.addEventListener('mouseenter', cancelHideTimer);
    tooltip.addEventListener('mouseleave', startHideTimer);
  };

  // convert hex like "#rrggbb" to rgba string with given alpha
  const hexToRgba = (hex, alpha = 0.12) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // apply a light highlight matching the event's dot color to the event text area
  const handleEventDidMount = info => {
    // prefer the explicit backgroundColor set on the event, otherwise look up by type
    const evtColor = info.event.backgroundColor || (info.event.extendedProps && info.event.extendedProps.type && typeColors[info.event.extendedProps.type]) || '#6366f1';

    // mark the root element to remove default background via CSS
    info.el.classList.add('calendar-event-no-bg');

    const highlight = hexToRgba(evtColor, 0.12); // light highlight (set as CSS variable)

    // FullCalendar month view places text in .fc-event-main or .fc-event-title
    const content = info.el.querySelector('.fc-event-main') || info.el.querySelector('.fc-event-title') || info.el;
    if (content) {
      content.classList.add('calendar-event-highlight');
      // set CSS variable for the per-event highlight color
      content.style.setProperty('--event-highlight', highlight);
    }
  };

  return (
    <>
     

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        eventMouseEnter={renderTooltip}
        eventMouseLeave={() => {}}
        eventDidMount={handleEventDidMount}
        height="auto"
      />
    </>
  );
};

export default TeamCalendar;