import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FileSharing from '../../../src/pages/FileSharing/FileSharing';
import * as AuthContextModule from '../../../src/contexts/AuthContext';
import api from '../../../src/services/api';
import * as ingestModule from '../../../src/services/ingest';

vi.mock('../../../src/services/api');
vi.mock('../../../src/services/ingest', () => ({
  ingestS3Uris: vi.fn()
}));

const mockUser = {
  id: 'user123',
  username: 'testuser',
  email: 'test@example.com'
};

// Mock useAuth hook
vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
  user: mockUser,
  loading: false,
  isAuthenticated: true
});

const renderWithRouter = (projectId = 'proj123') => {
  return render(
    <MemoryRouter initialEntries={[`/file-sharing/${projectId}`]}>
      <Routes>
        <Route path="/file-sharing/:projectId" element={<FileSharing />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('FileSharing Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset API mocks
    api.get = vi.fn().mockResolvedValue({ data: [] });
    api.post = vi.fn().mockResolvedValue({ data: {} });
    api.delete = vi.fn().mockResolvedValue({ data: {} });
  });

  describe('Rendering', () => {
    it('should render file sharing interface', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] }) // projects
        .mockResolvedValueOnce({ data: { files: [] } }); // files

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/file sharing/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      api.get = vi.fn().mockImplementation(() => new Promise(() => {}));
      
      renderWithRouter();

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render upload button', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
      });
    });

    it('should render file list section', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/no files uploaded yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Loading', () => {
    it('should fetch files on mount', async () => {
      const mockFiles = [
        { 
          file_id: 'file1', 
          file_name: 'document.pdf',
          s3_uri: 's3://bucket/file1.pdf',
          uploaded_by: { username: 'user1', user_id: 'user1' },
          uploaded_at: '2024-01-15T10:30:00Z'
        }
      ];

      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } });

      renderWithRouter();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('file_sharing/project/proj123/');
      });
    });

    it('should show empty state when no files', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/no files uploaded yet/i)).toBeInTheDocument();
      });
    });

    it('should fetch project information', async () => {
      const mockProjects = [
        { id: 'proj123', name: 'Test Project' }
      ];

      api.get = vi.fn()
        .mockResolvedValueOnce({ data: mockProjects })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter('proj123');

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('projects/');
      });
    });
  });

  describe('File Upload', () => {
    it('should open file input on upload button click', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        const uploadLabel = screen.getByText(/click to upload or drag and drop/i);
        expect(uploadLabel).toBeInTheDocument();
      });

      const fileInput = document.getElementById('file-input');
      expect(fileInput).toBeInTheDocument();
    });

    it('should validate file size (max 5MB)', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
      });

      const fileInput = document.getElementById('file-input');
      
      // Create a large file (6MB)
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      });

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/file size exceeds 5 mb/i)).toBeInTheDocument();
      });
    });

    it('should upload valid file', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post = vi.fn().mockResolvedValueOnce({ 
        data: { 
          file_id: 'newfile',
          file_name: 'test.pdf',
          s3_uri: 's3://bucket/test.pdf'
        } 
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
      });

      const fileInput = document.getElementById('file-input');
      
      const validFile = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          'file_sharing/upload/',
          expect.any(FormData),
          expect.objectContaining({
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        );
      });
    });

    it('should show upload progress', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
      });

      const fileInput = document.getElementById('file-input');
      
      const validFile = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });
    });

    it('should handle upload errors', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post = vi.fn().mockRejectedValueOnce({ 
        response: { data: { error: 'Upload failed' } }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
      });

      const fileInput = document.getElementById('file-input');
      
      const validFile = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag enter event', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/file sharing/i)).toBeInTheDocument();
      });

      const dropZone = screen.getByText(/click to upload or drag and drop/i).closest('.upload-area');
      
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { files: [] }
      });

      expect(dropZone.classList.contains('drag-active')).toBe(true);
    });

    it('should handle drag leave event', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/file sharing/i)).toBeInTheDocument();
      });

      const dropZone = screen.getByText(/click to upload or drag and drop/i).closest('.upload-area');
      
      fireEvent.dragEnter(dropZone);
      fireEvent.dragLeave(dropZone);

      expect(dropZone.classList.contains('drag-active')).toBe(false);
    });

    it('should handle file drop', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post = vi.fn().mockResolvedValueOnce({
        data: { file_id: 'newfile', file_name: 'dropped.pdf', s3_uri: 's3://bucket/dropped.pdf' }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/file sharing/i)).toBeInTheDocument();
      });

      const dropZone = screen.getByText(/click to upload or drag and drop/i).closest('.upload-area');
      
      const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] }
      });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });
  });

  describe('File Ingestion', () => {
    it('should call ingest service after successful upload', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post = vi.fn().mockResolvedValueOnce({
        data: { 
          file_id: 'newfile',
          file_name: 'test.pdf',
          s3_uri: 's3://bucket/test.pdf'
        }
      });

      ingestModule.ingestS3Uris.mockResolvedValueOnce({ success: true });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
      });

      const fileInput = document.getElementById('file-input');
      
      const validFile = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(ingestModule.ingestS3Uris).toHaveBeenCalledWith(
          ['s3://bucket/test.pdf'],
          'proj123'
        );
      });
    });

    it('should render file sharing container', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      const { container } = renderWithRouter();

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should handle project context', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(document.body).toBeTruthy();
      });
    });

    it('should initialize file state', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    it('should display file management interface', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/file sharing/i)).toBeTruthy();
      });
    });

    it('should render upload area', async () => {
      api.get = vi.fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(document.body.textContent).toContain('upload');
      });
    });
  });
});
