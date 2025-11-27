import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FileSharing from '../../../src/pages/FileSharing/FileSharing';
import { AuthContext } from '../../../src/contexts/AuthContext';
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

const renderWithRouter = (projectId = 'proj123', authValue = { user: mockUser }) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        <Routes>
          <Route path="/file-sharing/:projectId" element={<FileSharing />} />
        </Routes>
      </AuthContext.Provider>
    </BrowserRouter>,
    { initialEntries: [`/file-sharing/${projectId}`] }
  );
};

describe('FileSharing Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { files: [] } });
  });

  describe('Rendering', () => {
    it('should render file sharing interface', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] }) // projects
        .mockResolvedValueOnce({ data: { files: [] } }); // files

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/file sharing/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      
      renderWithRouter();

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render upload button', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
      });
    });

    it('should render file list section', async () => {
      api.get
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
          id: 'file1', 
          name: 'document.pdf',
          s3_uri: 's3://bucket/file1.pdf',
          uploaded_by: 'user1',
          uploaded_at: '2024-01-15T10:30:00Z'
        }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } });

      renderWithRouter();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('file_sharing/project/proj123/');
      });
    });

    it('should display uploaded files', async () => {
      const mockFiles = [
        { 
          id: 'file1', 
          name: 'document.pdf',
          s3_uri: 's3://bucket/file1.pdf',
          uploaded_by: 'testuser',
          uploaded_at: '2024-01-15T10:30:00Z'
        }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
      });
    });

    it('should show empty state when no files', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/no files uploaded yet/i)).toBeInTheDocument();
      });
    });

    it('should handle file loading errors', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockRejectedValueOnce({ 
          response: { data: { error: 'Failed to load files' } }
        });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/failed to load files/i)).toBeInTheDocument();
      });
    });

    it('should fetch project information', async () => {
      const mockProjects = [
        { id: 'proj123', name: 'Test Project' }
      ];

      api.get
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
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /upload/i });
        expect(uploadButton).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /upload/i });
      fireEvent.click(uploadButton);

      // File input should be triggered
      const fileInput = screen.getByLabelText(/upload file/i, { selector: 'input' });
      expect(fileInput).toBeInTheDocument();
    });

    it('should validate file size (max 5MB)', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/upload file/i, { selector: 'input' });
      
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
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post.mockResolvedValueOnce({ 
        data: { 
          file: { 
            id: 'newfile',
            name: 'test.pdf',
            s3_uri: 's3://bucket/test.pdf'
          } 
        } 
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/upload file/i, { selector: 'input' });
      
      const validFile = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          'file_sharing/upload/',
          expect.any(FormData)
        );
      });
    });

    it('should show upload progress', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/upload file/i, { selector: 'input' });
      
      const validFile = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });
    });

    it('should handle upload errors', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post.mockRejectedValueOnce({ 
        response: { data: { error: 'Upload failed' } }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/upload file/i, { selector: 'input' });
      
      const validFile = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });

    it('should refresh file list after successful upload', async () => {
      const initialFiles = [];
      const updatedFiles = [
        { id: 'newfile', name: 'uploaded.pdf', s3_uri: 's3://bucket/uploaded.pdf' }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: initialFiles } })
        .mockResolvedValueOnce({ data: { files: updatedFiles } }); // After upload

      api.post.mockResolvedValueOnce({ 
        data: { file: updatedFiles[0] } 
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/no files uploaded yet/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/upload file/i, { selector: 'input' });
      
      const validFile = new File(['content'], 'uploaded.pdf', { 
        type: 'application/pdf' 
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText('uploaded.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('File Download', () => {
    it('should show download button for files', async () => {
      const mockFiles = [
        { 
          id: 'file1', 
          name: 'document.pdf',
          s3_uri: 's3://bucket/file1.pdf',
          uploaded_by: 'testuser',
          uploaded_at: '2024-01-15T10:30:00Z'
        }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download document.pdf/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it('should request download URL when clicking download', async () => {
      const mockFiles = [
        { 
          id: 'file1', 
          name: 'document.pdf',
          s3_uri: 's3://bucket/file1.pdf'
        }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } });

      api.post.mockResolvedValueOnce({
        data: { url: 'https://s3.amazonaws.com/signed-url' }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download document.pdf/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('file_sharing/download/', {
          file_id: 'file1'
        });
      });
    });

    it('should handle download errors', async () => {
      const mockFiles = [
        { id: 'file1', name: 'document.pdf', s3_uri: 's3://bucket/file1.pdf' }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } });

      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Download failed' } }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download document.pdf/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/download failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Deletion', () => {
    it('should show delete button for own files', async () => {
      const mockFiles = [
        { 
          id: 'file1', 
          name: 'my-file.pdf',
          s3_uri: 's3://bucket/file1.pdf',
          uploaded_by: 'testuser'
        }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('my-file.pdf')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete my-file.pdf/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should delete file when confirmed', async () => {
      const mockFiles = [
        { id: 'file1', name: 'delete-me.pdf', s3_uri: 's3://bucket/file1.pdf' }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } })
        .mockResolvedValueOnce({ data: { files: [] } }); // After deletion

      api.delete.mockResolvedValueOnce({ data: { success: true } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('delete-me.pdf')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete delete-me.pdf/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('file_sharing/file1/');
      });
    });

    it('should handle deletion errors', async () => {
      const mockFiles = [
        { id: 'file1', name: 'delete-me.pdf', s3_uri: 's3://bucket/file1.pdf' }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } });

      api.delete.mockRejectedValueOnce({
        response: { data: { error: 'Deletion failed' } }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('delete-me.pdf')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete delete-me.pdf/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/deletion failed/i)).toBeInTheDocument();
      });
    });

    it('should show deleting state during deletion', async () => {
      const mockFiles = [
        { id: 'file1', name: 'delete-me.pdf', s3_uri: 's3://bucket/file1.pdf' }
      ];

      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: mockFiles } });

      api.delete.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('delete-me.pdf')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete delete-me.pdf/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/deleting/i)).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag enter event', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/file sharing/i)).toBeInTheDocument();
      });

      const dropZone = screen.getByText(/drag and drop files/i).closest('.drop-zone');
      
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { files: [] }
      });

      expect(dropZone.classList.contains('drag-active')).toBe(true);
    });

    it('should handle drag leave event', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/file sharing/i)).toBeInTheDocument();
      });

      const dropZone = screen.getByText(/drag and drop files/i).closest('.drop-zone');
      
      fireEvent.dragEnter(dropZone);
      fireEvent.dragLeave(dropZone);

      expect(dropZone.classList.contains('drag-active')).toBe(false);
    });

    it('should handle file drop', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post.mockResolvedValueOnce({
        data: { file: { id: 'newfile', name: 'dropped.pdf' } }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/file sharing/i)).toBeInTheDocument();
      });

      const dropZone = screen.getByText(/drag and drop files/i).closest('.drop-zone');
      
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
      api.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: { files: [] } });

      api.post.mockResolvedValueOnce({
        data: { 
          file: { 
            id: 'newfile',
            name: 'test.pdf',
            s3_uri: 's3://bucket/test.pdf'
          } 
        }
      });

      ingestModule.ingestS3Uris.mockResolvedValueOnce({ success: true });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/upload file/i, { selector: 'input' });
      
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
  });
});
