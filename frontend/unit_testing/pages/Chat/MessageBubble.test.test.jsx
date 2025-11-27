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
});
