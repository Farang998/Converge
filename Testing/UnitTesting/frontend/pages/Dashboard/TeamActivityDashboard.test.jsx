import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TeamActivityDashboard from '../../../src/pages/Dashboard/TeamActivityDashboard.jsx';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ 
      data: {
        activity_timeline: [],
        task_touch_frequency: [],
        active_contributors: [],
      } 
    })),
  },
}));

vi.mock('../../../src/pages/Dashboard/Charts/ActivityTimelineChart.jsx', () => ({
  default: () => <div>ActivityTimelineChart</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/ActiveContributorsChart.jsx', () => ({
  default: () => <div>ActiveContributorsChart</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/TaskTouchFrequencyChart.jsx', () => ({
  default: () => <div>TaskTouchFrequencyChart</div>,
}));

describe('TeamActivityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<TeamActivityDashboard projectId="123" />);
    expect(document.body).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<TeamActivityDashboard projectId="123" />);
    expect(screen.getByText(/loading team activity/i)).toBeInTheDocument();
  });

  it('should render activity timeline chart after loading', async () => {
    render(<TeamActivityDashboard projectId="123" />);
    await waitFor(() => {
      expect(screen.getByText(/activitytimelinechart/i)).toBeInTheDocument();
    });
  });

  it('should render analytics grid container', async () => {
    const { container } = render(<TeamActivityDashboard projectId="123" />);
    await waitFor(() => {
      expect(container.querySelector('.analytics-grid')).toBeInTheDocument();
    });
  });

  it('should render chart titles', async () => {
    render(<TeamActivityDashboard projectId="123" />);
    await waitFor(() => {
      expect(screen.getByText(/activity timeline/i)).toBeInTheDocument();
    });
  });
});
