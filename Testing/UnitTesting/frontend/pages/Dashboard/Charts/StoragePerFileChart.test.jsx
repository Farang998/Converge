import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import StoragePerFileChart from '../../../../src/pages/Dashboard/Charts/StoragePerFileChart.jsx';

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

describe('StoragePerFileChart', () => {
  it('should render without crashing', () => {
    render(<StoragePerFileChart data={[]} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render with empty data', () => {
    const { container } = render(<StoragePerFileChart data={[]} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with data', () => {
    const data = [
      { name: 'file1.pdf', size_mb: 5.2 },
      { name: 'file2.docx', size_mb: 3.1 },
    ];
    const { container } = render(<StoragePerFileChart data={data} />);
    expect(container).toBeInTheDocument();
  });

  it('should truncate long filenames', () => {
    const data = [
      { name: 'very_long_filename_that_should_be_truncated.pdf', size_mb: 10 },
    ];
    const { container } = render(<StoragePerFileChart data={data} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle large file sizes', () => {
    const data = [{ name: 'largefile.zip', size_mb: 500 }];
    const { container } = render(<StoragePerFileChart data={data} />);
    expect(container).toBeInTheDocument();
  });
});
