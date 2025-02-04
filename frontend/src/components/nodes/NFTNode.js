// frontend/src/components/nodes/NFTNode.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Handle } from 'reactflow';
import { useNodeData } from '../../../hooks/useNodeData';
import { nftNodeProps } from '../../propTypes/nodeTypes';


export default function NFTNode({ id, data }) {
  const { updateNodeData } = useNodeData(id);
  const [newCreator, setNewCreator] = useState({ address: '', share: '' });

  const addCreator = () => {
    if (newCreator.address && newCreator.share) {
      updateNodeData({
        creators: [...(data.creators || []), newCreator]
      });
      setNewCreator({ address: '', share: '' });
    }
  };

  return (
    <div className="node nft-node">
      <div className="node-header">
        <h4>🖼 NFT Mint</h4>
        <Handle type="source" position="right" />
      </div>

      <div className="node-body">
        <label>
          Metadata URI
          <input
            value={data.uri || ''}
            onChange={(e) => updateNodeData({ uri: e.target.value })}
            placeholder="https://metadata.example.com"
          />
        </label>

        <label>
          Royalties (%)
          <input
            type="number"
            value={data.royalties || ''}
            onChange={(e) => updateNodeData({ royalties: e.target.value })}
            min="0"
            max="100"
          />
        </label>

        <div className="creators-section">
          <h5>Creators</h5>
          <div className="creator-input">
            <input
              placeholder="Creator Address"
              value={newCreator.address}
              onChange={(e) => setNewCreator({...newCreator, address: e.target.value})}
            />
            <input
              type="number"
              placeholder="Share %"
              value={newCreator.share}
              onChange={(e) => setNewCreator({...newCreator, share: e.target.value})}
              min="0"
              max="100"
            />
            <button onClick={addCreator}>Add</button>
          </div>
          
          {(data.creators || []).map((creator, index) => (
            <div key={index} className="creator-item">
              <span>{creator.address}</span>
              <span>{creator.share}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

NFTNode.propTypes = nftNodeProps;
