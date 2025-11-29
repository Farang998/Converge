import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkflowHealthGauge from '../../../../src/pages/Dashboard/Charts/WorkflowHealthGauge';

describe('WorkflowHealthGauge', () => {
  it('should render without crashing', () => {
    render(<WorkflowHealthGauge score={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should display score percentage', () => {
    render(<WorkflowHealthGauge score={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should display completed tasks', () => {
    const totals = { completed: 5, total: 10 };
    render(<WorkflowHealthGauge score={50} totals={totals} />);
    expect(screen.getByText(/5 \/ 10 completed/i)).toBeInTheDocument();
  });

  it('should handle default score of 100', () => {
    render(<WorkflowHealthGauge />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should handle default totals', () => {
    render(<WorkflowHealthGauge score={50} />);
    expect(screen.getByText(/0 \/ 0 completed/i)).toBeInTheDocument();
  });

  it('should normalize score above 100 to 100', () => {
    render(<WorkflowHealthGauge score={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should normalize negative score to 0', () => {
    render(<WorkflowHealthGauge score={-10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should render SVG gauge', () => {
    const { container } = render(<WorkflowHealthGauge score={75} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
