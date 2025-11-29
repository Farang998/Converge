import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActiveContributorsChart from '../../../../src/pages/Dashboard/Charts/ActiveContributorsChart.jsx';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div>Bar</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  Tooltip: () => <div>Tooltip</div>,
  CartesianGrid: () => <div>Grid</div>,
}));

describe('ActiveContributorsChart', () => {
  it('should render without crashing', () => {
    render(<ActiveContributorsChart data={[]} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should show no data message when empty', () => {
    render(<ActiveContributorsChart data={[]} />);
    expect(screen.getByText(/no contributors data/i)).toBeInTheDocument();
  });

  it('should render with data', () => {
    const data = [
      { name: 'User1', value: 10 },
      { name: 'User2', value: 5 },
    ];
    const { container } = render(<ActiveContributorsChart data={data} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle single contributor', () => {
    const data = [{ name: 'User1', value: 15 }];
    const { container } = render(<ActiveContributorsChart data={data} />);
    expect(container).toBeInTheDocument();
  });
});
