import React from 'react';

const NodeToolbar = ({ onAddNode }) => {
  const nodeTypes = [
    { id: 'account', label: 'ACCOUNT', tooltip: 'Create a new Account node' },
    { id: 'token', label: 'TOKEN', tooltip: 'Create a new Token node' },
    { id: 'nft', label: 'NFT', tooltip: 'Create a new NFT node' },
    { id: 'dao', label: 'DAO', tooltip: 'Create a new DAO node' },
    { id: 'mint', label: 'MINT', tooltip: 'Create a new Mint node' }
  ];

  return (
    <div className="node-toolbar" role="toolbar" aria-label="Node creation toolbar">
      {nodeTypes.map(type => (
        <button
          key={type.id}
          className={`node-button ${type.id}-node`}
          onClick={() => onAddNode(type.id, { x: 100, y: 100 })}
          title={type.tooltip}
          aria-label={type.tooltip}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
};

export default NodeToolbar;
