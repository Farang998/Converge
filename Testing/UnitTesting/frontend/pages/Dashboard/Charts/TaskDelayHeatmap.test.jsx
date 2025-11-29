import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskDelayHeatmap from '../../../../src/pages/Dashboard/Charts/TaskDelayHeatmap.jsx';

describe('TaskDelayHeatmap', () => {
  it('should render without crashing', () => {
    render(<TaskDelayHeatmap data={[]} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should show no data message when empty', () => {
    render(<TaskDelayHeatmap data={[]} />);
    expect(screen.getByText(/no data for heatmap/i)).toBeInTheDocument();
  });

  it('should render heatmap cells with data', () => {
    const data = [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 3 },
    ];
    const { container } = render(<TaskDelayHeatmap data={data} />);
    expect(container.querySelector('.heatmap-grid')).toBeInTheDocument();
  });

  it('should render heatmap rows', () => {
    const data = [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 3 },
    ];
    const { container } = render(<TaskDelayHeatmap data={data} />);
    expect(container.querySelector('.heatmap-row')).toBeInTheDocument();
  });

  it('should render heatmap cells', () => {
    const data = [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 3 },
    ];
    const { container } = render(<TaskDelayHeatmap data={data} />);
    const cells = container.querySelectorAll('.heatmap-cell');
    expect(cells.length).toBeGreaterThan(0);
  });
});
