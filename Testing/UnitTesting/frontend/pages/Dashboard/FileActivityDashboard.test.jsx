import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FileActivityDashboard from '../../../src/pages/Dashboard/FileActivityDashboard.jsx';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ 
      data: {
        storage_per_file: [],
        top_uploaders: [],
        file_types: [],
      } 
    })),
  },
}));

vi.mock('../../../src/pages/Dashboard/Charts/StoragePerFileChart.jsx', () => ({
  default: () => <div>StoragePerFileChart</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/TopUploadersChart.jsx', () => ({
  default: () => <div>TopUploadersChart</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/FileTypesPieChart.jsx', () => ({
  default: () => <div>FileTypesPieChart</div>,
}));

describe('FileActivityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<FileActivityDashboard projectId="123" />);
    expect(document.body).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<FileActivityDashboard projectId="123" />);
    expect(screen.getByText(/loading file analytics/i)).toBeInTheDocument();
  });

  it('should render storage chart after loading', async () => {
    render(<FileActivityDashboard projectId="123" />);
    await waitFor(() => {
      expect(screen.getByText(/storageperfilechart/i)).toBeInTheDocument();
    });
  });

  it('should render analytics grid container', async () => {
    const { container } = render(<FileActivityDashboard projectId="123" />);
    await waitFor(() => {
      expect(container.querySelector('.analytics-grid')).toBeInTheDocument();
    });
  });

  it('should render chart titles', async () => {
    render(<FileActivityDashboard projectId="123" />);
    await waitFor(() => {
      expect(screen.getByText(/storage usage/i)).toBeInTheDocument();
    });
  });
});
