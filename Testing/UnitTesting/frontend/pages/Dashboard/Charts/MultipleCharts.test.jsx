import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkloadChart from '../../../../src/pages/Dashboard/Charts/WorkloadChart';
import ProjectProgressChart from '../../../../src/pages/Dashboard/Charts/ProjectProgressChart';
import TopUploadersChart from '../../../../src/pages/Dashboard/Charts/TopUploadersChart';
import StoragePerFileChart from '../../../../src/pages/Dashboard/Charts/StoragePerFileChart';
import ActiveContributorsChart from '../../../../src/pages/Dashboard/Charts/ActiveContributorsChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  LabelList: () => <div data-testid="label-list" />,
  RadialBarChart: ({ children }) => <div data-testid="radial-bar-chart">{children}</div>,
  RadialBar: () => <div data-testid="radial-bar" />,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
}));

describe('Dashboard Charts', () => {
  describe('WorkloadChart', () => {
    const mockData = [
      { user: 'John', tasks: 10 },
      { user: 'Jane', tasks: 8 },
    ];

    it('should render without crashing', () => {
      render(<WorkloadChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render bar chart', () => {
      render(<WorkloadChart data={mockData} />);
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should handle empty data', () => {
      render(<WorkloadChart data={[]} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('ProjectProgressChart', () => {
    const mockData = [
      { project: 'Project A', progress: 75 },
      { project: 'Project B', progress: 50 },
    ];

    it('should render without crashing', () => {
      render(<ProjectProgressChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render chart', () => {
      render(<ProjectProgressChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('TopUploadersChart', () => {
    const mockData = [
      { user: 'Alice', uploads: 25 },
      { user: 'Bob', uploads: 20 },
    ];

    it('should render without crashing', () => {
      render(<TopUploadersChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle empty data', () => {
      render(<TopUploadersChart data={[]} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('StoragePerFileChart', () => {
    const mockData = [
      { name: 'doc1.pdf', size_mb: 1.5 },
      { name: 'image.png', size_mb: 2.3 },
    ];

    it('should render without crashing', () => {
      render(<StoragePerFileChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render with valid data', () => {
      render(<StoragePerFileChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('ActiveContributorsChart', () => {
    const mockData = [
      { contributor: 'User1', contributions: 15 },
      { contributor: 'User2', contributions: 12 },
    ];

    it('should render without crashing', () => {
      render(<ActiveContributorsChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle empty data', () => {
      render(<ActiveContributorsChart data={[]} />);
      expect(screen.getByText(/no contributors data/i)).toBeInTheDocument();
    });
  });
});
