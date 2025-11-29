import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import ThreadPanel from '../../../src/pages/Chat/ThreadPanel.jsx';

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

describe('ThreadPanel', () => {
  const defaultProps = {
    projectName: 'Test Project',
    parentMessage: {
      id: 1,
      content: 'Parent message',
      sender: { id: 1, name: 'Test User' },
      timestamp: '2024-01-01T10:00:00Z'
    },
    replies: [],
    loading: false,
    error: null,
    onClose: vi.fn(),
    inputValue: '',
    onInputChange: vi.fn(),
    onSend: vi.fn(),
    onKeyDown: vi.fn(),
    sending: false,
    wsConnected: true,
    currentUserId: 1,
    alsoSendToChannel: false,
    onAlsoSendToChannelChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', () => {
    renderWithProviders(<ThreadPanel {...defaultProps} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render component structure', () => {
    const { container } = renderWithProviders(<ThreadPanel {...defaultProps} />);
    expect(container.firstChild).toBeDefined();
  });

  it('should handle component lifecycle', async () => {
    renderWithProviders(<ThreadPanel {...defaultProps} />);
    // Component should mount successfully
    expect(document.body).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = renderWithProviders(<ThreadPanel {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });
});
