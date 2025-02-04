import React from 'react';

const NodeToolbar = ({ onAddNode }) => {
  const nodeTypes = ['account', 'token', 'nft', 'dao', 'mint'];

  return (
    <div className="node-toolbar">
      {nodeTypes.map(type => (
        <button
          key={type}
          className={`node-button ${type}-node`}
          onClick={() => onAddNode(type, { x: 100, y: 100 })}
        >
          {type.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default NodeToolbar;
