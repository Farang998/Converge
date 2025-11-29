import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FileTypesPieChart from '../../../../src/pages/Dashboard/Charts/FileTypesPieChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('FileTypesPieChart', () => {
  const mockData = [
    { type: 'PDF', count: 20 },
    { type: 'Image', count: 15 },
    { type: 'Document', count: 10 },
  ];

  it('should render without crashing', () => {
    render(<FileTypesPieChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render pie chart', () => {
    render(<FileTypesPieChart data={mockData} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    render(<FileTypesPieChart data={[]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
