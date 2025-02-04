import React from 'react';
import PropTypes from 'prop-types';
import { Handle } from 'reactflow';
import { useNodeData } from '../../../hooks/useNodeData';
import { daoNodeProps } from '../../propTypes/nodeTypes';


export default function DAONode({ id, data }) {
  const { updateNodeData } = useNodeData(id);

  return (
    <div className="node dao-node">
      <div className="node-header">
        <h4>🏛 DAO Setup</h4>
        <Handle type="source" position="right" />
      </div>

      <div className="node-body">
        <label>
          DAO Name
          <input
            value={data.name || ''}
            onChange={(e) => updateNodeData({ name: e.target.value })}
          />
        </label>

        <label>
          Proposal Threshold (%)
          <input
            type="number"
            value={data.threshold || ''}
            onChange={(e) => updateNodeData({ threshold: e.target.value })}
            min="1"
            max="100"
          />
        </label>

        <label>
          Council Token Mint
          <input
            value={data.councilMint || ''}
            onChange={(e) => updateNodeData({ councilMint: e.target.value })}
            placeholder="Token Mint Address"
          />
        </label>

        <label>
          Community Token Mint
          <input
            value={data.communityMint || ''}
            onChange={(e) => updateNodeData({ communityMint: e.target.value })}
            placeholder="Token Mint Address"
          />
        </label>
      </div>
    </div>
  );
}

DAONode.propTypes = daoNodeProps;
