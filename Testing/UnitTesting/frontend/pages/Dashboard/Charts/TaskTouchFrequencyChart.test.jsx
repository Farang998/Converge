import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskTouchFrequencyChart from '../../../../src/pages/Dashboard/Charts/TaskTouchFrequencyChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  LabelList: () => <div data-testid="label-list" />,
}));

describe('TaskTouchFrequencyChart', () => {
  const mockData = [
    { name: 'Task A', value: 5 },
    { name: 'Task B', value: 3 },
  ];

  it('should render without crashing', () => {
    render(<TaskTouchFrequencyChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render bar chart', () => {
    render(<TaskTouchFrequencyChart data={mockData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should render chart components', () => {
    render(<TaskTouchFrequencyChart data={mockData} />);
    expect(screen.getByTestId('bar')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    render(<TaskTouchFrequencyChart data={[]} />);
    expect(screen.getByText(/no touch frequency data/i)).toBeInTheDocument();
  });

  it('should handle undefined data', () => {
    render(<TaskTouchFrequencyChart />);
    expect(screen.getByText(/no touch frequency data/i)).toBeInTheDocument();
  });
});
