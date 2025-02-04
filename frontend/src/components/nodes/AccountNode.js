import React from 'react';
import PropTypes from 'prop-types';
import { Handle } from 'reactflow';
import { useNodeData } from '../../../hooks/useNodeData';
import { accountNodeProps } from '../../propTypes/nodeTypes';


export default function AccountNode({ id, data }) {
  const { updateNodeData } = useNodeData(id);

  return (
    <div className="node account-node">
      <div className="node-header">
        <h4>🏦 Solana Account</h4>
        <Handle type="source" position="right" />
      </div>
      
      <div className="node-body">
        <label>
          Initial Balance (SOL)
          <input
            type="number"
            value={data.balance || ''}
            onChange={(e) => updateNodeData({ balance: e.target.value })}
            min="0"
            step="0.1"
          />
        </label>

        <label>
          Token Account
          <input
            type="checkbox"
            checked={data.isTokenAccount || false}
            onChange={(e) => updateNodeData({ isTokenAccount: e.target.checked })}
          />
          <span className="helper-text">
            {data.isTokenAccount ? 'SPL Token Account' : 'Native SOL Account'}
          </span>
        </label>
      </div>
    </div>
  );
}

AccountNode.propTypes = accountNodeProps;
