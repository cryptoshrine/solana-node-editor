import React, { useState, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
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

const initialNodes = [];
const initialEdges = [];

export default function MainCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onAddNode = useCallback((type, position) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label: type.toUpperCase() }
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  return (
    <div style={{ width: '100%', height: '100vh' }} className="react-flow-wrapper">
      <ValidatorStatus />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
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
        <NodeToolbar onAddNode={onAddNode} />
      </ReactFlow>
    </div>
  );
}
