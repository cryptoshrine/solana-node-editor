import React, { useEffect, useCallback, useRef } from 'react';
import ReactFlow, { 
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import './canvas.css';
import NodeToolbar from './NodeToolbar';
import ValidatorStatus from './ValidatorStatus';
import { 
  AccountNode,
  TokenNode,
  NFTNode,
  DAONode,
  MintNode
} from '../nodes';

const nodeTypes = {
  account: AccountNode,
  token: TokenNode,
  nft: NFTNode,
  dao: DAONode,
  mint: MintNode
};

export default function MainCanvas({ 
  nodes: initialNodes, 
  edges: initialEdges, 
  onNodesChange,
  onEdgesChange 
}) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();
  const fitViewTimeoutRef = useRef(null);

  // Add connection handler
  const onConnect = useCallback(
    (connection) => {
      const newEdge = addEdge(connection, edges);
      setEdges(newEdge);
    },
    [edges, setEdges]
  );

  // Sync with parent's nodes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Sync with parent's edges
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Notify parent of changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      onNodesChange(nodes);
    }, 100);
    return () => clearTimeout(timeout);
  }, [nodes, onNodesChange]);

  useEffect(() => {
    onEdgesChange(edges);
  }, [edges, onEdgesChange]);

  // Handle fitView with delay
  useEffect(() => {
    if (nodes.length > 0) {
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
      }
      fitViewTimeoutRef.current = setTimeout(() => {
        fitView({ padding: 0.2, duration: 200 });
      }, 100);
    }
    return () => {
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
      }
    };
  }, [nodes.length, fitView]);

  return (
    <div className="canvas-container">
      <NodeToolbar />
      <div className="react-flow-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeInternal}
          onEdgesChange={onEdgesChangeInternal}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView={false}
        >
          <Background 
            color="#888" 
            gap={32} 
            variant="dots" 
          />
          <Controls />
          <MiniMap 
            nodeColor={(n) => {
              if (n.type === 'account') return '#4dabf7';
              if (n.type === 'token') return '#40c057';
              if (n.type === 'nft') return '#7950f2';
              if (n.type === 'dao') return '#f03e3e';
              return '#ff922b';
            }}
            zoomable
            pannable
          />
        </ReactFlow>
      </div>
      <ValidatorStatus />
    </div>
  );
}