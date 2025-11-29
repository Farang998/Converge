import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import DAGVisualization from '../../../../../src/pages/ProjectWorkspace/Tasks/components/DAGVisualization.jsx';

vi.mock('reactflow', () => ({
  default: ({ children }) => <div data-testid="reactflow">{children}</div>,
  Controls: () => <div>Controls</div>,
  Background: () => <div>Background</div>,
  MiniMap: () => <div>MiniMap</div>,
  useNodesState: () => [[], vi.fn()],
  useEdgesState: () => [[], vi.fn()],
  MarkerType: { ArrowClosed: 'arrowclosed' },
  BackgroundVariant: { Dots: 'dots' },
}));

vi.mock('dagre', () => ({
  default: {
    graphlib: {
      Graph: vi.fn(() => ({
        setDefaultEdgeLabel: vi.fn(),
        setGraph: vi.fn(),
        setNode: vi.fn(),
        setEdge: vi.fn(),
        node: vi.fn(() => ({ x: 0, y: 0 })),
      })),
    },
    layout: vi.fn(),
  },
}));

vi.mock('../../../../../src/pages/ProjectWorkspace/Tasks/components/TaskNode.jsx', () => ({
  default: () => <div>TaskNode</div>,
}));

describe('DAGVisualization', () => {
  const mockProps = {
    nodes: [],
    edges: [],
    onEdgesChange: vi.fn(),
    onNodeEdit: vi.fn(),
    onNodeDelete: vi.fn(),
    onAddEdge: vi.fn(),
    onRemoveEdge: vi.fn(),
    isTeamLeader: false,
    pendingEdges: [],
    onNotification: vi.fn(),
  };

  it('should render without crashing', () => {
    render(<DAGVisualization {...mockProps} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render ReactFlow component', () => {
    const { getByTestId } = render(<DAGVisualization {...mockProps} />);
    expect(getByTestId('reactflow')).toBeInTheDocument();
  });

  it('should render with nodes', () => {
    const nodes = [{ id: '1', data: { name: 'Task 1', status: 'pending' }, position: { x: 0, y: 0 } }];
    const { container } = render(<DAGVisualization {...mockProps} nodes={nodes} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with edges', () => {
    const edges = [{ id: 'e1', source: '1', target: '2' }];
    const { container } = render(<DAGVisualization {...mockProps} edges={edges} />);
    expect(container).toBeInTheDocument();
  });
});
