import { useMemo, useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import TaskNode from './TaskNode';

const nodeTypes = {
  taskNode: TaskNode,
};

const getLayoutedElements = (nodes, edges) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 120 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 125,
        y: nodeWithPosition.y - 60,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const DAGVisualization = ({ nodes: taskNodes, edges: taskEdges, onEdgesChange: onTaskEdgesChange, onNodeEdit, onNodeDelete, onAddEdge, onRemoveEdge, isTeamLeader, pendingEdges = [], onNotification }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const initialNodes = useMemo(
    () =>
      taskNodes.map((task) => ({
        id: task.id,
        type: 'taskNode',
        data: {
          ...task,
          onEdit: onNodeEdit,
          onDelete: onNodeDelete,
          tasksList: taskNodes, // provide full list for dependency name mapping
        },
        position: { x: 0, y: 0 },
      })),
    [taskNodes, onNodeEdit, onNodeDelete]
  );

  // Get connected edges for hover highlighting
  const getConnectedEdges = useCallback((nodeId) => {
    const incomingEdges = taskEdges.filter(edge => edge.to === nodeId);
    const outgoingEdges = taskEdges.filter(edge => edge.from === nodeId);
    return { incomingEdges, outgoingEdges };
  }, [taskEdges]);

  // This logic is for dynamic edge styling in React Flow, NOT Tailwind.
  // It is preserved to maintain the hover functionality.
  const initialEdges = useMemo(
    () =>
      taskEdges.map((edge, index) => {
        const { incomingEdges, outgoingEdges } = hoveredNodeId 
          ? getConnectedEdges(hoveredNodeId)
          : { incomingEdges: [], outgoingEdges: [] };

        const isIncoming = incomingEdges.some(e => e.from === edge.from && e.to === edge.to);
        const isOutgoing = outgoingEdges.some(e => e.from === edge.from && e.to === edge.to);
        
        // Check if this edge is pending
        const isPending = pendingEdges.some(pe => pe.from === edge.from && pe.to === edge.to);

        let edgeColor = '#687272ff';
        let edgeWidth = 2;
        let animated = false;

        if (isPending) {
          edgeColor = '#ff9800'; // Orange for pending
          edgeWidth = 3;
          animated = true;
        } else if (hoveredNodeId) {
          if (isOutgoing) {
            edgeColor = 'var(--primary-darker)'; // Dependents (outgoing)
            edgeWidth = 3;
          } else if (isIncoming) {
            edgeColor = 'var(--accent-darker)'; // Priors (incoming)
            edgeWidth = 3;
          } else {
            edgeColor = '#cccccc'; // Dimmed
            edgeWidth = 1;
          }
        }

        return {
          id: `edge-${index}`,
          source: edge.from,
          target: edge.to,
          type: 'smoothstep',
          animated,
          style: { stroke: edgeColor, strokeWidth: edgeWidth },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
            width: 20,
            height: 20,
          },
        };
      }),
    [taskEdges, hoveredNodeId, getConnectedEdges, pendingEdges]
  );

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges),
    [initialNodes, initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Recalculate layout when nodes or edges change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = getLayoutedElements(initialNodes, initialEdges);
    setNodes(newNodes);
    setEdges(newEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskNodes, taskEdges]);

  // Update edges when hover state changes
  useEffect(() => {
    setEdges(initialEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEdges]);

  const onNodeMouseEnter = useCallback((event, node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    // Allow removing pending edges by clicking them
    const edgeData = {
      from: edge.source,
      to: edge.target,
    };
    
    if (pendingEdges.some(pe => pe.from === edgeData.from && pe.to === edgeData.to)) {
      onRemoveEdge(edgeData);
    }
  }, [pendingEdges, onRemoveEdge]);

  const onConnect = useCallback((params) => {
    if (!isTeamLeader) {
      if (onNotification) {
        onNotification({
          type: 'error',
          title: 'Permission Denied',
          message: 'Only the team leader can create dependencies. Please contact your team leader to add dependencies.',
        });
      }
      return;
    }
    
    const newEdge = {
      from: params.source,
      to: params.target,
    };
    onAddEdge(newEdge);
  }, [taskEdges, onAddEdge, isTeamLeader, onNotification]);

  return (
    <div className="dag-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ stroke: '#000000ff', strokeWidth: 2 }}
        connectionLineType="smoothstep"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d4a574"
        />
        <Controls className="dag-controls" />
        <MiniMap
          nodeColor={(node) => {
            const status = node.data.status;
            if (status === 'completed') return 'var(--accent)';
            if (status === 'in_progress') return 'var(--primary)';
            return '#808080';
          }}
          className="dag-minimap"
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>
    </div>
  );
};
export default DAGVisualization;