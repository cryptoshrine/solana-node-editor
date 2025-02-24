// frontend/src/components/nodes/NFTNode.js
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from 'reactflow';
import toast from 'react-hot-toast';
import { createNft } from '../../api/nft';

// Helper to generate symbol from label
const generateSymbol = (label) => {
  // Remove "NFT: " prefix if present
  const cleanLabel = label.replace(/^NFT:\s*/, '');
  // Remove file extension if present
  const nameOnly = cleanLabel.replace(/\.[^/.]+$/, '');
  // Take first 4 characters, uppercase them, remove non-alphanumeric
  return nameOnly
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase() || 'NFT';
};

// Helper to truncate address
const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const NFTNode = ({ id, data }) => {
  const [isMinting, setIsMinting] = useState(false);
  const [mintAddress, setMintAddress] = useState(null); // Add state for mint address

  const handleMint = useCallback(async () => {
    console.log('Mint button clicked', { data }); // Debug log
    
    if (isMinting) {
      console.log('Already minting, ignoring click');
      return;
    }

    setIsMinting(true);
    const toastId = toast.loading('Initializing NFT mint...');

    try {
      // Basic validation
      if (!data.uri || !data.label) {
        console.log('Validation failed:', { uri: data.uri, label: data.label });
        toast.error('Missing NFT data (name or URI)', { id: toastId });
        return;
      }

      // Generate symbol if not provided
      const symbol = data.symbol || generateSymbol(data.label);
      console.log('Using symbol:', symbol);

      console.log('Calling createNft with:', {
        name: data.label,
        symbol,
        uri: data.uri,
        royalties: data.royalties,
        creators: data.creators
      });

      // Call the backend to create the NFT
      const result = await createNft({
        name: data.label,
        symbol,
        uri: data.uri,
        royalties: data.royalties,
        creators: data.creators
      });

      console.log('NFT creation successful:', result);
      setMintAddress(result.mint); // Store the mint address

      // Success: display a toast with a link to Solscan on Devnet
      toast.success(
        <div>
          NFT Minted!{' '}
          <span
            className="tx-link"
            onClick={() =>
              window.open(
                `https://solscan.io/token/${result.mint}?cluster=devnet`,
                '_blank'
              )
            }
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            View on Solscan
          </span>
        </div>,
        { id: toastId }
      );

      // Optionally call the node's onMint callback
      if (data.onMint) {
        console.log('Calling onMint callback with result:', result);
        data.onMint(result);
      }

    } catch (error) {
      console.error('Minting error:', error);
      toast.error(`Minting failed: ${error.message}`, { id: toastId });
    } finally {
      console.log('Minting process completed');
      setIsMinting(false);
    }
  }, [data, isMinting]);

  // Generate symbol for display
  const displaySymbol = data.symbol || (data.label ? generateSymbol(data.label) : 'NFT');

  return (
    <div className="node nft-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <h4>🖼 {data.label || 'NFT Node'}</h4>
        <button
          className={`mint-button ${isMinting ? 'minting' : ''}`}
          onClick={handleMint}
          disabled={!data.uri || isMinting}
          title={!data.uri ? 'Missing metadata URI' : isMinting ? 'Minting in progress...' : 'Mint NFT'}
          style={{
            cursor: !data.uri || isMinting ? 'not-allowed' : 'pointer',
            opacity: !data.uri || isMinting ? 0.6 : 1,
            position: 'relative',
            minWidth: '100px',
            padding: '8px 16px',
            backgroundColor: isMinting ? '#4a1d96' : '#6d28d9',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
        >
          {isMinting ? (
            <>
              <span 
                style={{ 
                  display: 'inline-block',
                  marginRight: '8px',
                  animation: 'spin 1s linear infinite'
                }}
              >
                ⚡
              </span>
              Minting...
            </>
          ) : (
            'Mint NFT'
          )}
        </button>
      </div>
      <div className="node-body">
        <div className="field">
          <label>URI</label>
          <div className="field-value">{data.uri || 'No metadata URI provided'}</div>
        </div>
        <div className="field">
          <label>Symbol</label>
          <div className="field-value">{displaySymbol}</div>
        </div>
        <div className="field">
          <label>Name</label>
          <div className="field-value">{data.label || 'Unnamed NFT'}</div>
        </div>
        <div className="field">
          <label>Royalty</label>
          <div className="field-value">{data.royalties ? `${data.royalties}%` : '0%'}</div>
        </div>
        {data.creators && data.creators.length > 0 && (
          <div className="field">
            <label>Creators</label>
            <div className="field-value">
              {data.creators.map((creator, index) => (
                <div key={index} className="creator-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span title={creator.address} style={{ color: '#000000' }}>
                    {truncateAddress(creator.address)}
                  </span>
                  <span style={{ marginLeft: '8px', color: '#ffffff' }}>
                    {creator.share}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {mintAddress && (
          <div className="field">
            <label>Explorer</label>
            <div className="field-value">
              <a
                href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f44336', textDecoration: 'underline', cursor: 'pointer' }}
              >
                View on Explorer
              </a>
            </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .mint-button:not(:disabled):hover {
            background-color: #5b21b6 !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .mint-button:not(:disabled):active {
            transform: translateY(0);
            background-color: #4c1d95 !important;
          }
          .field {
            margin-bottom: 8px;
          }
          .field-value {
            word-break: break-all;
          }
          .creator-row:hover {
            background-color: rgba(109, 40, 217, 0.1);
            border-radius: 4px;
          }
        `}
      </style>
    </div>
  );
};

NFTNode.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    uri: PropTypes.string,
    symbol: PropTypes.string,
    label: PropTypes.string,
    royalties: PropTypes.number,
    creators: PropTypes.arrayOf(
      PropTypes.shape({
        address: PropTypes.string.isRequired,
        share: PropTypes.number.isRequired,
      })
    ),
    onMint: PropTypes.func,
  }).isRequired,
};

export default NFTNode;
