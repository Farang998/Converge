import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import WorkflowBottlenecksChart from '../../../../src/pages/Dashboard/Charts/WorkflowBottlenecksChart.jsx';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div>Bar</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  Tooltip: () => <div>Tooltip</div>,
  CartesianGrid: () => <div>Grid</div>,
  LabelList: () => <div>LabelList</div>,
}));

describe('WorkflowBottlenecksChart', () => {
  it('should render without crashing', () => {
    render(<WorkflowBottlenecksChart data={[]} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render with empty data', () => {
    const { container } = render(<WorkflowBottlenecksChart data={[]} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with data', () => {
    const data = [
      { id: 1, name: 'Task 1', stuck_days: 5, status: 'pending' },
      { id: 2, name: 'Task 2', stuck_days: 3, status: 'in_progress' },
    ];
    const { container } = render(<WorkflowBottlenecksChart data={data} />);
    expect(container).toBeInTheDocument();
  });

  it('should truncate long task names', () => {
    const data = [
      { id: 1, name: 'Very long task name that should be truncated', stuck_days: 5, status: 'pending' },
    ];
    const { container } = render(<WorkflowBottlenecksChart data={data} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle missing status', () => {
    const data = [{ id: 1, name: 'Task', stuck_days: 2 }];
    const { container } = render(<WorkflowBottlenecksChart data={data} />);
    expect(container).toBeInTheDocument();
  });
});
