import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriorityByDueDateChart from '../../../../src/pages/Dashboard/Charts/PriorityByDueDateChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('PriorityByDueDateChart', () => {
  const mockData = [
    { name: 'Urgent', value: 25 },
    { name: 'High', value: 15 },
    { name: 'Medium', value: 10 },
    { name: 'Low', value: 5 },
  ];

  it('should render without crashing', () => {
    render(<PriorityByDueDateChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render bar chart', () => {
    render(<PriorityByDueDateChart data={mockData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should render chart components', () => {
    render(<PriorityByDueDateChart data={mockData} />);
    expect(screen.getByTestId('bar')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('should render tooltip', () => {
    render(<PriorityByDueDateChart data={mockData} />);
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    render(<PriorityByDueDateChart data={[]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
