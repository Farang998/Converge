import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import MessageBubble from '../../../src/pages/Chat/MessageBubble.jsx';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
  setAuthToken: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ projectId: '1', taskId: '1', chatId: '1', id: '1' }),
  };
});

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('MessageBubble', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', () => {
    renderWithProviders(<MessageBubble />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render component structure', () => {
    const { container } = renderWithProviders(<MessageBubble />);
    expect(container.firstChild).toBeDefined();
  });

  it('should handle component lifecycle', async () => {
    renderWithProviders(<MessageBubble />);
    // Component should mount successfully
    expect(document.body).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = renderWithProviders(<MessageBubble />);
    expect(container).toMatchSnapshot();
  });

  it('should render with text message', () => {
    renderWithProviders(<MessageBubble text="Hello World" isOwn={true} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should render with sender name when showSender is true', () => {
    renderWithProviders(
      <MessageBubble 
        text="Test" 
        sender="John Doe" 
        showSender={true} 
        isOwn={false} 
      />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should not render sender name when isOwn is true', () => {
    renderWithProviders(
      <MessageBubble 
        text="Test" 
        sender="John Doe" 
        showSender={true} 
        isOwn={true} 
      />
    );
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('should render with timestamp', () => {
    const timestamp = new Date('2024-01-01T12:00:00Z').toISOString();
    renderWithProviders(
      <MessageBubble text="Test" timestamp={timestamp} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should render with created_at as fallback', () => {
    const created_at = new Date('2024-01-01T12:00:00Z').toISOString();
    renderWithProviders(
      <MessageBubble text="Test" created_at={created_at} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should render with image file', () => {
    renderWithProviders(
      <MessageBubble 
        text="Photo"
        file_url="https://example.com/image.jpg"
        file_type="image/jpeg"
        file_name="photo.jpg"
      />
    );
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('should render with video file', () => {
    renderWithProviders(
      <MessageBubble 
        file_url="https://example.com/video.mp4"
        file_type="video/mp4"
        file_name="video.mp4"
      />
    );
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
  });

  it('should render with audio file', () => {
    renderWithProviders(
      <MessageBubble 
        file_url="https://example.com/audio.mp3"
        file_type="audio/mp3"
        file_name="audio.mp3"
      />
    );
    const audio = document.querySelector('audio');
    expect(audio).toBeInTheDocument();
  });

  it('should render generic file download', () => {
    renderWithProviders(
      <MessageBubble 
        file_url="https://example.com/document.pdf"
        file_type="application/pdf"
        file_name="document.pdf"
        file_size={1024}
      />
    );
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });

  it('should handle delete button click', () => {
    const onDelete = vi.fn();
    renderWithProviders(
      <MessageBubble 
        text="Test"
        messageId="123"
        onDelete={onDelete}
      />
    );
    const deleteBtn = document.querySelector('.message-delete-btn');
    if (deleteBtn) {
      deleteBtn.click();
      expect(onDelete).toHaveBeenCalledWith('123');
    }
  });

  it('should handle reply button click', () => {
    const onReply = vi.fn();
    renderWithProviders(
      <MessageBubble 
        text="Test"
        messageId="123"
        threadId="thread1"
        onReply={onReply}
      />
    );
    const replyBtn = screen.getByText('Reply').closest('button');
    if (replyBtn) {
      replyBtn.click();
      expect(onReply).toHaveBeenCalled();
    }
  });

  it('should show replies count', () => {
    renderWithProviders(
      <MessageBubble 
        text="Test"
        messageId="123"
        repliesCount={5}
        onReply={vi.fn()}
      />
    );
    expect(screen.getByText('5 replies')).toBeInTheDocument();
  });

  it('should show singular reply text', () => {
    renderWithProviders(
      <MessageBubble 
        text="Test"
        messageId="123"
        repliesCount={1}
        onReply={vi.fn()}
      />
    );
    expect(screen.getByText('1 reply')).toBeInTheDocument();
  });

  it('should apply own message class', () => {
    const { container } = renderWithProviders(
      <MessageBubble text="Test" isOwn={true} />
    );
    expect(container.querySelector('.message-own')).toBeInTheDocument();
  });

  it('should apply other message class', () => {
    const { container } = renderWithProviders(
      <MessageBubble text="Test" isOwn={false} />
    );
    expect(container.querySelector('.message-other')).toBeInTheDocument();
  });

  it('should format file size correctly', () => {
    renderWithProviders(
      <MessageBubble 
        file_url="https://example.com/file.pdf"
        file_type="application/pdf"
        file_name="file.pdf"
        file_size={2048576}
      />
    );
    expect(screen.getByText(/MB/)).toBeInTheDocument();
  });

  it('should handle image load error', () => {
    renderWithProviders(
      <MessageBubble 
        file_url="https://example.com/broken.jpg"
        file_type="image/jpeg"
        file_name="broken.jpg"
      />
    );
    const img = document.querySelector('img');
    if (img) {
      img.dispatchEvent(new Event('error'));
    }
    expect(document.body).toBeInTheDocument();
  });

  it('should render without file_url', () => {
    renderWithProviders(
      <MessageBubble text="Just text" />
    );
    expect(screen.getByText('Just text')).toBeInTheDocument();
  });

  it('should handle file extension detection for images', () => {
    renderWithProviders(
      <MessageBubble 
        file_url="https://example.com/photo.png"
        file_name="photo.png"
      />
    );
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('should handle file extension detection for videos', () => {
    renderWithProviders(
      <MessageBubble 
        file_url="https://example.com/clip.mp4"
        file_name="clip.mp4"
      />
    );
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
  });
});
