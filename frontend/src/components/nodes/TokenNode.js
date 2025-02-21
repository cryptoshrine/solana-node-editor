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

export default function TokenNode({ id, data }) {
  const { updateNodeData } = useNodeData(id);
  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const { connected, publicKey } = useWallet();
  const nodeRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);

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

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to create token');
      }

      // Update node data with the mint address and transaction info
      updateNodeData({
        ...data,
        mint: result.token.mint,
        metadataAddress: result.token.metadataAddress,
        metadataSignature: result.token.metadataSignature,
        status: 'created'
      });

    } catch (error) {
      console.error('Error creating token:', error);
      alert(`Failed to create token: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="node token-node" ref={nodeRef}>
      <div className="node-header">
        <h4>🪙 Token Node</h4>
        <Handle type="target" position="left" />
        <Handle type="source" position="right" />
      </div>

      <div className="node-body">
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

        {data.mint && (
          <div className="node-info">
            <div className="address-container">
              <span>Mint Address: </span>
              <a
                href={getExplorerUrl(data.mint)}
                target="_blank"
                rel="noopener noreferrer"
                className="address-link"
                title={data.mint}
              >
                {truncateAddress(data.mint)}
              </a>
            </div>
            {data.metadataAddress && (
              <div className="address-container">
                <span>Metadata Address: </span>
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
          </div>
        )}
      </div>
    </div>
  );
}

TokenNode.propTypes = tokenNodeProps;