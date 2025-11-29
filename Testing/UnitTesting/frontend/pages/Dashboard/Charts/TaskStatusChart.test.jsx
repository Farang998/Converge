import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskStatusChart from '../../../../src/pages/Dashboard/Charts/TaskStatusChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('TaskStatusChart', () => {
  const mockData = [
    { status: 'Completed', count: 10 },
    { status: 'In Progress', count: 5 },
    { status: 'Pending', count: 3 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<TaskStatusChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render pie chart', () => {
    render(<TaskStatusChart data={mockData} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should render with empty data', () => {
    render(<TaskStatusChart data={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('should handle undefined data', () => {
    render(<TaskStatusChart />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});
