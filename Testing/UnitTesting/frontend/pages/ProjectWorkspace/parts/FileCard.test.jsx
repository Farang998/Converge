import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FileCard from '../../../../src/pages/ProjectWorkspace/parts/FileCard';

vi.mock('../../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

describe('FileCard', () => {
  const mockFile = {
    file_id: '1',
    file_name: 'test-file.pdf',
    file_size: 1024,
    uploaded_at: '2024-01-15T10:30:00Z',
    uploaded_by: { username: 'user1' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<FileCard file={mockFile} projectId="123" />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render file name', () => {
    render(<FileCard file={mockFile} projectId="123" />);
    expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
  });

  it('should format file size correctly', () => {
    const { container } = render(<FileCard file={mockFile} projectId="123" />);
    expect(container.textContent).toContain('KB');
  });

  it('should render download button', () => {
    render(<FileCard file={mockFile} projectId="123" />);
    const downloadBtn = screen.getByRole('button');
    expect(downloadBtn).toBeInTheDocument();
  });

  it('should display uploaded by user', () => {
    render(<FileCard file={mockFile} projectId="123" />);
    expect(screen.getByText(/user1/i)).toBeInTheDocument();
  });

  it('should show access count info', () => {
    render(<FileCard file={mockFile} projectId="123" />);
    expect(screen.getByText(/all project members/i)).toBeInTheDocument();
  });

  it('should handle file with zero bytes', () => {
    const zeroByteFile = { ...mockFile, file_size: 0 };
    const { container } = render(<FileCard file={zeroByteFile} projectId="123" />);
    expect(container.textContent).toContain('0 Bytes');
  });

  it('should render file card container', () => {
    const { container } = render(<FileCard file={mockFile} projectId="123" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should display file metadata', () => {
    render(<FileCard file={mockFile} projectId="123" />);
    expect(screen.getByText('test-file.pdf')).toBeTruthy();
  });

  it('should render with project ID', () => {
    render(<FileCard file={mockFile} projectId="456" />);
    expect(document.body).toBeTruthy();
  });

  it('should show file information', () => {
    render(<FileCard file={mockFile} projectId="123" />);
    expect(screen.getByText(/user1/i)).toBeTruthy();
  });

  it('should handle file object', () => {
    const { container } = render(<FileCard file={mockFile} projectId="123" />);
    expect(container.querySelector('button')).toBeInTheDocument();
  });
});
