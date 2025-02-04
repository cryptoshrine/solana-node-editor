import React from 'react';
import { Handle, Position } from 'reactflow';

const createNode = (type) => {
  return function CustomNode({ data }) {
    return (
      <div className={`node ${type}-node`}>
        <Handle type="target" position={Position.Top} />
        <div className="node-content">
          <div className="node-header">{type.toUpperCase()}</div>
          <div className="node-body">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="node-field">
                <span className="field-label">{key}:</span>
                <span className="field-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  };
};

export const AccountNode = createNode('account');
export const TokenNode = createNode('token');
export const NFTNode = createNode('nft');
export const DAONode = createNode('dao');
export const MintNode = createNode('mint');
