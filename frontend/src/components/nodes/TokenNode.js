import React from 'react';
import PropTypes from 'prop-types';
import { Handle } from 'reactflow';
import { useNodeData } from '../../../hooks/useNodeData';
import { tokenNodeProps } from '../../propTypes/nodeTypes';


export default function TokenNode({ id, data }) {
  const { updateNodeData } = useNodeData(id);

  return (
    <div className="node token-node">
      <div className="node-header">
        <h4>🪙 Create Token</h4>
        <Handle type="source" position="right" />
      </div>

      <div className="node-body">
        <label>
          Token Name
          <input
            value={data.name || ''}
            onChange={(e) => updateNodeData({ name: e.target.value })}
          />
        </label>

        <label>
          Symbol
          <input
            value={data.symbol || ''}
            onChange={(e) => updateNodeData({ symbol: e.target.value })}
            maxLength="5"
          />
        </label>

        <label>
          Decimals
          <input
            type="number"
            value={data.decimals || ''}
            onChange={(e) => updateNodeData({ 
              decimals: Math.min(9, Math.max(0, e.target.value))
            })}
            min="0"
            max="9"
          />
        </label>

        <label>
          Mint Authority
          <input
            value={data.mintAuthority || ''}
            onChange={(e) => updateNodeData({ mintAuthority: e.target.value })}
            placeholder="Public Key"
          />
        </label>
      </div>
    </div>
  );
}

TokenNode.propTypes = tokenNodeProps;
