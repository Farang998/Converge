import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import TopUploadersChart from '../../../../src/pages/Dashboard/Charts/TopUploadersChart.jsx';

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

describe('TopUploadersChart', () => {
  it('should render without crashing', () => {
    render(<TopUploadersChart data={[]} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render with empty data', () => {
    const { container } = render(<TopUploadersChart data={[]} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with data', () => {
    const data = [
      { username: 'User1', uploads: 15 },
      { username: 'User2', uploads: 10 },
      { username: 'User3', uploads: 5 },
    ];
    const { container } = render(<TopUploadersChart data={data} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle single uploader', () => {
    const data = [{ username: 'User1', uploads: 20 }];
    const { container } = render(<TopUploadersChart data={data} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle zero uploads', () => {
    const data = [{ username: 'User1', uploads: 0 }];
    const { container } = render(<TopUploadersChart data={data} />);
    expect(container).toBeInTheDocument();
  });
});
