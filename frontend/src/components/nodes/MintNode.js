import React from 'react';
import PropTypes from 'prop-types';
import { Handle } from 'reactflow';
import { useNodeData } from '../../../hooks/useNodeData';
import { mintNodeProps } from '../../propTypes/nodeTypes';


export default function MintNode({ id, data }) {
  const { updateNodeData } = useNodeData(id);

  return (
    <div className="node mint-node">
      <div className="node-header">
        <h4>➕ Mint Tokens</h4>
        <Handle type="target" position="left" />
        <Handle type="source" position="right" />
      </div>

      <div className="node-body">
        <label>
          Mint Address
          <input
            value={data.mintAddress || ''}
            onChange={(e) => updateNodeData({ mintAddress: e.target.value })}
            placeholder="Token Mint Address"
          />
        </label>

        <label>
          Destination Account
          <input
            value={data.destination || ''}
            onChange={(e) => updateNodeData({ destination: e.target.value })}
            placeholder="Token Account Address"
          />
        </label>

        <label>
          Amount
          <input
            type="number"
            value={data.amount || ''}
            onChange={(e) => updateNodeData({ amount: e.target.value })}
            min="0"
          />
        </label>

        <label>
          Mint Authority
          <input
            value={data.authority || ''}
            onChange={(e) => updateNodeData({ authority: e.target.value })}
            placeholder="Authority Public Key"
          />
        </label>
      </div>
    </div>
  );
}

MintNode.propTypes = mintNodeProps;
