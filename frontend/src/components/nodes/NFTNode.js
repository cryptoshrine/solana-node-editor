import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from 'reactflow';

const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const NFTNode = ({ id, data }) => {
  const [hoveredCreator, setHoveredCreator] = useState(null);

  return (
    <div className="node nft-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <h4>🖼 NFT</h4>
      </div>
      <div className="node-body">
        <div className="field">
          <label>URI</label>
          <div className="field-value">{data.uri}</div>
        </div>

        <div className="field">
          <label>Royalties</label>
          <div className="field-value">{data.royalties}%</div>
        </div>

        <div className="creators-section">
          <h5>Creators</h5>
          <div className="creators-list">
            {Array.isArray(data.creators) && data.creators.map((creator, index) => (
              <div 
                key={index} 
                className="creator-item"
                onMouseEnter={() => setHoveredCreator(index)}
                onMouseLeave={() => setHoveredCreator(null)}
              >
                <div className="creator-info">
                  <div className="creator-address">
                    {truncateAddress(creator.address)}
                  </div>
                  <div className="creator-share">
                    {creator.share}%
                  </div>
                </div>
                {hoveredCreator === index && (
                  <div className="creator-tooltip">
                    {creator.address}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

NFTNode.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    uri: PropTypes.string,
    royalties: PropTypes.number,
    creators: PropTypes.arrayOf(PropTypes.shape({
      address: PropTypes.string,
      share: PropTypes.number
    })),
    label: PropTypes.string
  }).isRequired
};

export default NFTNode;
