import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkflowTimelineChart from '../../../../src/pages/Dashboard/Charts/WorkflowTimelineChart';

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

describe('WorkflowTimelineChart', () => {
  const mockCreatedSeries = [
    { date: '2024-01-01', count: 5 },
    { date: '2024-01-02', count: 3 },
  ];

  const mockDueSeries = [
    { date: '2024-01-01', count: 2 },
    { date: '2024-01-03', count: 4 },
  ];

  it('should render without crashing', () => {
    render(<WorkflowTimelineChart createdSeries={mockCreatedSeries} dueSeries={mockDueSeries} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render line chart', () => {
    render(<WorkflowTimelineChart createdSeries={mockCreatedSeries} dueSeries={mockDueSeries} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should render chart components', () => {
    render(<WorkflowTimelineChart createdSeries={mockCreatedSeries} dueSeries={mockDueSeries} />);
    expect(screen.getAllByTestId('line')).toHaveLength(2);
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('should handle empty series', () => {
    render(<WorkflowTimelineChart createdSeries={[]} dueSeries={[]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle undefined series', () => {
    render(<WorkflowTimelineChart />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render legend', () => {
    render(<WorkflowTimelineChart createdSeries={mockCreatedSeries} dueSeries={mockDueSeries} />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });
});
