import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import WorkloadChart from '../../../../src/pages/Dashboard/Charts/WorkloadChart.jsx';

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

describe('WorkloadChart', () => {
  it('should render without crashing', () => {
    render(<WorkloadChart data={[]} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render with empty data', () => {
    const { container } = render(<WorkloadChart data={[]} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with data', () => {
    const data = [
      { name: 'User1', value: 5 },
      { name: 'User2', value: 3 },
    ];
    const { container } = render(<WorkloadChart data={data} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle unassigned tasks', () => {
    const data = [{ name: null, value: 2 }];
    const { container } = render(<WorkloadChart data={data} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle missing value', () => {
    const data = [{ name: 'User1' }];
    const { container } = render(<WorkloadChart data={data} />);
    expect(container).toBeInTheDocument();
  });
});
