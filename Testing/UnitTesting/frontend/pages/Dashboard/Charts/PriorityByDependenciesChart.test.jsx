import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriorityByDependenciesChart from '../../../../src/pages/Dashboard/Charts/PriorityByDependenciesChart';

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

describe('PriorityByDependenciesChart', () => {
  const mockData = [
    { name: 'High Priority', value: 10 },
    { name: 'Medium Priority', value: 5 },
    { name: 'Low Priority', value: 2 },
  ];

  it('should render without crashing', () => {
    render(<PriorityByDependenciesChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render bar chart', () => {
    render(<PriorityByDependenciesChart data={mockData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should render chart components', () => {
    render(<PriorityByDependenciesChart data={mockData} />);
    expect(screen.getByTestId('bar')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    render(<PriorityByDependenciesChart data={[]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
