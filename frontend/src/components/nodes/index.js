import React from 'react';
import { Handle, Position } from 'reactflow';
import NFTNodeComponent from './NFTNode';

const formatValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item, index) => (
      typeof item === 'object' ? 
        Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ') :
        String(item)
    )).join('; ');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ');
  }
  return String(value || '');
};

const createNode = (type) => {
  return function CustomNode({ id, data }) {
    return (
      <div className={`node ${type}-node`}>
        <Handle type="target" position={Position.Top} />
        <div className="node-content">
          <div className="node-header">{type.toUpperCase()}</div>
          <div className="node-body">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="node-field">
                <span className="field-label">{key}:</span>
                <span className="field-value">{formatValue(value)}</span>
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
export const NFTNode = NFTNodeComponent; 
export const DAONode = createNode('dao');
export const MintNode = createNode('mint');
