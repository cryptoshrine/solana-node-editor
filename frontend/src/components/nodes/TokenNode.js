import React, { useState, useLayoutEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Handle } from 'reactflow';
import { useNodeData } from '../../hooks/useNodeData';
import { tokenNodeProps } from '../../propTypes/nodeTypes';
import useWallet from '../../hooks/useWallet';
import './TokenNode.css';
import axios from 'axios';

// Helper function to truncate addresses
const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Helper function to get explorer URL
const getExplorerUrl = (address) => {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
};

// Helper function to get solscan URL (more user-friendly)
const getSolscanUrl = (address) => {
  return `https://solscan.io/token/${address}?cluster=devnet`;
};

export default function TokenNode({ id, data }) {
  const { updateNodeData } = useNodeData(id);
  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const { connected, publicKey } = useWallet();
  const nodeRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tokenDetails, setTokenDetails] = useState(null);

  const validateField = (field, value) => {
    let error = null;
    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) {
          error = 'Name is required';
        }
        break;
      case 'symbol':
        if (!value || value.trim().length < 2 || value.trim().length > 5) {
          error = 'Symbol must be 2-5 characters';
        }
        break;
      case 'decimals':
        const decimals = parseInt(value);
        if (isNaN(decimals) || decimals < 0 || decimals > 9) {
          error = 'Decimals must be 0-9';
        }
        break;
      case 'initialSupply':
        const supply = parseInt(value);
        if (isNaN(supply) || supply <= 0 || supply > 1000000000) {
          error = 'Supply must be 1-1,000,000,000';
        }
        break;
      default:
        break;
    }
    return !error;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!validateField('name', data.name)) {
      newErrors.name = 'Name is required';
    }
    if (!validateField('symbol', data.symbol)) {
      newErrors.symbol = 'Symbol must be 2-5 characters';
    }
    if (!validateField('decimals', data.decimals)) {
      newErrors.decimals = 'Decimals must be 0-9';
    }
    if (data.initialSupply && !validateField('initialSupply', data.initialSupply)) {
      newErrors.initialSupply = 'Supply must be 1-1,000,000,000';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateToken = async () => {
    if (!validateForm() || isCreating) return;
    
    try {
      setIsCreating(true);
      
      // Create token with metadata
      const response = await axios.post('/api/solana/create-token', {
        name: data.name,
        symbol: data.symbol,
        decimals: parseInt(data.decimals),
        initialSupply: data.initialSupply ? parseInt(data.initialSupply) : undefined,
        uri: data.uri || '',
      });

      console.log('Token creation response:', response.data);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create token');
      }

      // Update tokenDetails with successful creation
      setTokenDetails({
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        initialSupply: data.initialSupply,
        mint: result.token.mint,
        metadataAddress: result.token.metadataAddress,
        status: 'created'
      });

      // Update node data with the mint address and token info
      updateNodeData({
        ...data,
        mint: result.token.mint,
        metadataAddress: result.token.metadataAddress,
        status: 'created'
      });

    } catch (error) {
      console.error('Error creating token:', error);
      alert(`Failed to create token: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // If we have a mint address from backend response but no stored tokenDetails
  useLayoutEffect(() => {
    if (data.mint && !tokenDetails) {
      setTokenDetails({
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        initialSupply: data.initialSupply,
        mint: data.mint,
        metadataAddress: data.metadataAddress,
        status: 'created'
      });
    }
  }, [data.mint, tokenDetails]);

  return (
    <div className="node token-node" ref={nodeRef}>
      <div className="node-header">
        <h4>🪙 {data.symbol || 'Token'} Token</h4>
        <Handle type="target" position="left" />
        <Handle type="source" position="right" />
      </div>

      <div className="node-body">
        {/* Show input fields only when token is not created yet */}
        {!data.mint && (
          <>
            <div className="node-field">
              <label className="field-label">Name</label>
              <input
                className="field-value"
                value={data.name || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (validateField('name', value)) {
                    updateNodeData({ name: value });
                  }
                }}
                placeholder="My Token"
              />
              {errors.name && (
                <div className="error-message">{errors.name}</div>
              )}
            </div>

            <div className="node-field">
              <label className="field-label">Symbol</label>
              <input
                className="field-value"
                value={data.symbol || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  if (validateField('symbol', value)) {
                    updateNodeData({ symbol: value });
                  }
                }}
                placeholder="TKN"
                maxLength={5}
              />
              {errors.symbol && (
                <div className="error-message">{errors.symbol}</div>
              )}
            </div>

            <div className="node-field">
              <label className="field-label">Decimals</label>
              <input
                className="field-value"
                type="number"
                value={data.decimals ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (validateField('decimals', value)) {
                    updateNodeData({ decimals: parseInt(value) });
                  }
                }}
                min="0"
                max="9"
                placeholder="9"
              />
              {errors.decimals && (
                <div className="error-message">{errors.decimals}</div>
              )}
            </div>

            <div className="node-field">
              <label className="field-label">Initial Supply</label>
              <input
                className="field-value"
                type="number"
                value={data.initialSupply ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (validateField('initialSupply', value)) {
                    updateNodeData({ initialSupply: parseInt(value) });
                  }
                }}
                min="1"
                max="1000000000"
                placeholder="1000000"
              />
              {errors.initialSupply && (
                <div className="error-message">{errors.initialSupply}</div>
              )}
            </div>

            <div className="node-field">
              <label className="field-label">Metadata URI (Optional)</label>
              <input
                className="field-value"
                value={data.uri || ''}
                onChange={(e) => updateNodeData({ uri: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="node-actions">
              <button
                className="create-button"
                disabled={!connected || isCreating || Object.keys(errors).length > 0}
                onClick={handleCreateToken}
              >
                {isCreating ? 'Creating...' : 'Create Token'}
              </button>
            </div>
          </>
        )}

        {/* Show token info after creation */}
        {data.mint && (
          <div className="token-details">
            <div className="token-info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{data.name}</span>
            </div>
            <div className="token-info-row">
              <span className="info-label">Symbol:</span>
              <span className="info-value">{data.symbol}</span>
            </div>
            <div className="token-info-row">
              <span className="info-label">Decimals:</span>
              <span className="info-value">{data.decimals}</span>
            </div>
            <div className="token-info-row">
              <span className="info-label">Initial Supply:</span>
              <span className="info-value">{data.initialSupply}</span>
            </div>
            <div className="token-info-row">
              <span className="info-label">Mint Address:</span>
              <a
                href={getSolscanUrl(data.mint)}
                target="_blank"
                rel="noopener noreferrer"
                className="address-link"
                title={data.mint}
              >
                {truncateAddress(data.mint)}
              </a>
            </div>
            {data.metadataAddress && (
              <div className="token-info-row">
                <span className="info-label">Metadata:</span>
                <a
                  href={getExplorerUrl(data.metadataAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link"
                  title={data.metadataAddress}
                >
                  {truncateAddress(data.metadataAddress)}
                </a>
              </div>
            )}
            <div className="token-links">
              <a
                href={`https://solscan.io/token/${data.mint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="token-explorer-link"
              >
                View on Solscan
              </a>
              <a
                href={`https://explorer.solana.com/address/${data.mint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="token-explorer-link"
              >
                View on Explorer
              </a>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
        .token-node {
          border: 2px solid #4caf50;
          background-color: #e8f5e9;
        }
        .node-header {
          background-color: #4caf50;
          color: white;
          padding: 10px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .create-button {
          background-color: #4caf50;
          color: white;
          border: none;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 4px;
          margin-top: 10px;
          width: 100%;
        }
        .create-button:hover {
          background-color: #45a049;
        }
        .create-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        .token-details {
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
          margin-top: 10px;
        }
        .token-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          color: #333;
        }
        .info-value {
          color: #4caf50;
        }
        .address-link {
          color: #2196f3;
          text-decoration: underline;
          cursor: pointer;
        }
        .token-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }
        .token-explorer-link {
          background-color: #2196f3;
          color: white;
          padding: 6px 12px;
          text-align: center;
          border-radius: 4px;
          text-decoration: none;
        }
        .token-explorer-link:hover {
          background-color: #0b7dda;
        }
        `}
      </style>
    </div>
  );
}

TokenNode.propTypes = tokenNodeProps;