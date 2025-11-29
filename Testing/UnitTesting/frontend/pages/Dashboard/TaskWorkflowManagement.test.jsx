import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TaskWorkflowManagement from '../../../src/pages/Dashboard/TaskWorkflowManagement.jsx';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ 
      data: {
        timeline: [],
        health_score: 85,
        bottlenecks: [],
        heatmap: [],
      } 
    })),
  },
}));

vi.mock('../../../src/pages/Dashboard/Charts/WorkflowTimelineChart.jsx', () => ({
  default: () => <div>WorkflowTimelineChart</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/TaskDelayHeatmap.jsx', () => ({
  default: () => <div>TaskDelayHeatmap</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/WorkflowBottlenecksChart.jsx', () => ({
  default: () => <div>WorkflowBottlenecksChart</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/WorkflowHealthGauge.jsx', () => ({
  default: () => <div>WorkflowHealthGauge</div>,
}));

describe('TaskWorkflowManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<TaskWorkflowManagement projectId="123" />);
    expect(document.body).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<TaskWorkflowManagement projectId="123" />);
    expect(screen.getByText(/loading workflow/i)).toBeInTheDocument();
  });

  it('should render workflow timeline chart after loading', async () => {
    render(<TaskWorkflowManagement projectId="123" />);
    await waitFor(() => {
      expect(screen.getByText(/workflowtimelinechart/i)).toBeInTheDocument();
    });
  });

  it('should render analytics grid container', async () => {
    const { container } = render(<TaskWorkflowManagement projectId="123" />);
    await waitFor(() => {
      expect(container.querySelector('.analytics-grid')).toBeInTheDocument();
    });
  });
});
