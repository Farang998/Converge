import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityTimelineChart from '../../../../src/pages/Dashboard/Charts/ActivityTimelineChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('ActivityTimelineChart', () => {
  const mockData = [
    { date: '2024-01-01', activities: 10 },
    { date: '2024-01-02', activities: 15 },
    { date: '2024-01-03', activities: 8 },
  ];

  it('should render without crashing', () => {
    render(<ActivityTimelineChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render line chart', () => {
    render(<ActivityTimelineChart data={mockData} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    render(<ActivityTimelineChart data={[]} />);
    expect(screen.getByText(/no timeline data/i)).toBeInTheDocument();
  });
});
