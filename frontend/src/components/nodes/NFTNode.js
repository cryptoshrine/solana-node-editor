import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from 'reactflow';
import useWallet from '../../hooks/useWallet';
import toast from 'react-hot-toast';

const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const NFTNode = ({ id, data }) => {
  const [hoveredCreator, setHoveredCreator] = useState(null);
  const [isMinting, setIsMinting] = useState(false);
  const { connected, publicKey, sendTransactionToBackend } = useWallet();

  const handleMint = useCallback(async () => {
    if (isMinting) return;
    setIsMinting(true);
    const toastId = toast.loading('Initializing mint...');

    try {
      if (!connected) {
        toast.error('Please connect your wallet to mint NFTs', { id: toastId });
        return;
      }

      if (!data.uri) {
        toast.error('Metadata URI is required for minting', { id: toastId });
        return;
      }

      // Validation checks
      if (data.royalties < 0 || data.royalties > 100) {
        toast.error('Royalties must be between 0-100%', { id: toastId });
        return;
      }

      const totalShares = data.creators?.reduce((sum, c) => sum + c.share, 0) || 0;
      if (totalShares !== 100) {
        toast.error('Creator shares must sum to 100%', { id: toastId });
        return;
      }

      const mintParams = {
        name: data.label || 'Unnamed NFT',
        symbol: data.symbol || 'NFT',
        uri: data.uri,
        creators: data.creators?.map(creator => ({
          address: creator.address,
          share: creator.share
        })),
        royalties: data.royalties || 0
      };

      console.log('Initiating mint with params:', mintParams);
      toast.loading('Sending transaction...', { id: toastId });
      
      const result = await sendTransactionToBackend('mint-nft', mintParams);
      console.log('Mint result:', result);

      toast.success(
        <div>
          Successfully minted NFT!
          <span 
            className="tx-link"
            onClick={() => window.open(`https://explorer.solana.com/tx/${result.signature}?cluster=custom`, '_blank')}
          >
            View Transaction
          </span>
        </div>,
        { id: toastId }
      );

      data.onMint?.(result);
    } catch (error) {
      console.error('Full mint error:', error);
      toast.error(`Minting failed: ${error.message}`, { id: toastId });
    } finally {
      setIsMinting(false);
    }
  }, [connected, data, isMinting, sendTransactionToBackend]);

  return (
    <div className="node nft-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <h4>🖼 {data.label || 'NFT Node'}</h4>
        <button 
          className="mint-button"
          onClick={handleMint}
          disabled={!data.uri || !connected || isMinting}
          title={!data.uri ? "Missing metadata URI" : !connected ? "Connect wallet to mint" : "Mint NFT"}
        >
          {isMinting ? 'Minting...' : 'Mint NFT'}
        </button>
      </div>
      <div className="node-body">
        <div className="field">
          <label>URI</label>
          <div className="field-value">{data.uri || 'No metadata URI provided'}</div>
        </div>

        <div className="field">
          <label>Symbol</label>
          <div className="field-value">{data.symbol || 'NFT'}</div>
        </div>

        <div className="field">
          <label>Royalties</label>
          <div className="field-value">{data.royalties || 0}%</div>
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
    symbol: PropTypes.string,
    royalties: PropTypes.number,
    creators: PropTypes.arrayOf(PropTypes.shape({
      address: PropTypes.string,
      share: PropTypes.number
    })),
    label: PropTypes.string,
    onMint: PropTypes.func
  }).isRequired
};

export default NFTNode;