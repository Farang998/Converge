import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import TeamCalendar from '../../../../../src/pages/ProjectWorkspace/Calendar/TeamCalendar/TeamCalendar';

// Mock FullCalendar
vi.mock('@fullcalendar/react', () => ({
  default: () => <div>FullCalendar</div>,
}));

vi.mock('@fullcalendar/daygrid', () => ({
  default: {},
}));

vi.mock('@fullcalendar/timegrid', () => ({
  default: {},
}));

vi.mock('@fullcalendar/interaction', () => ({
  default: {},
}));

vi.mock('../../../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('../../../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'testuser' },
  }),
}));

describe('TeamCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<TeamCalendar projectId="1" token="test-token" />);
    expect(document.body).toBeTruthy();
  });

  it('should render FullCalendar component', () => {
    render(<TeamCalendar projectId="1" token="test-token" />);
    expect(document.body.textContent).toContain('FullCalendar');
  });

  it('should render with team leader role', () => {
    render(<TeamCalendar projectId="1" token="test-token" isTeamLeader={true} />);
    expect(document.body.textContent).toContain('FullCalendar');
  });

  it('should render calendar container', () => {
    const { container } = render(<TeamCalendar projectId="1" token="test-token" />);
    expect(container.firstChild).toBeTruthy();
  });
});
