// frontend/src/components/nodes/TokenNode.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Handle } from 'reactflow';
import { useNodeData } from '../../hooks/useNodeData';
import { tokenNodeProps } from '../../propTypes/nodeTypes';
import { createToken } from '../../api/solana';
import useWallet from '../../hooks/useWallet';

export default function TokenNode({ id, data }) {
  const { updateNodeData } = useNodeData(id);
  const [errors, setErrors] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { connected } = useWallet();

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    if (name === 'symbol') {
      if (!/^[A-Z]{2,5}$/.test(value)) {
        newErrors.symbol = 'Symbol must be 2-5 uppercase letters';
      } else {
        delete newErrors.symbol;
      }
    }
    
    if (name === 'decimals') {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 9) {
        newErrors.decimals = 'Decimals must be between 0-9';
      } else {
        delete newErrors.decimals;
      }
    }

    if (name === 'initialSupply') {
      const num = Number(value);
      if (isNaN(num) || num <= 0 || num > 1000000000 || !Number.isInteger(num)) {
        newErrors.initialSupply = 'Supply must be 1-1,000,000,000 whole number';
      } else {
        delete newErrors.initialSupply;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateToken = async () => {
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setIsCreating(true);
      console.log('Creating token with data:', {
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        mintAuthority: data.mintAuthority,
        initialSupply: data.initialSupply
      });

      const result = await createToken({
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        mintAuthority: data.mintAuthority,
        initialSupply: data.initialSupply
      });
      
      console.log('Token creation response:', result);
      
      // Update node with token address
      updateNodeData({ 
        tokenAddress: result.token.mint,
        txId: result.token.txId,
        explorerUrl: result.token.explorerUrl
      });
      
      console.log('Node data updated with:', {
        tokenAddress: result.token.mint,
        txId: result.token.txId,
        explorerUrl: result.token.explorerUrl
      });
      
      // Show success message
      alert(`Token created successfully! View on explorer: ${result.token.explorerUrl}`);
    } catch (error) {
      console.error('Token creation error:', error);
      alert(`Failed to create token: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="node token-node">
      <Handle type="target" position="top" />
      
      <div className="node-header">
        <h4> {data.name || 'Token Node'}</h4>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="field-label">Name</label>
          <input
            className="field-value"
            value={data.name || ''}
            onChange={(e) => updateNodeData({ name: e.target.value })}
            placeholder="Token Name"
          />
        </div>

        <div className="node-field">
          <label className="field-label">Symbol ({data.symbol?.length || 0}/5)</label>
          <input
            className="field-value"
            value={data.symbol || ''}
            onChange={(e) => {
              const value = e.target.value.toUpperCase();
              validateField('symbol', value);
              updateNodeData({ symbol: value });
            }}
            maxLength="5"
            placeholder="TKN"
          />
          {errors.symbol && <div className="error-message">{errors.symbol}</div>}
        </div>

        <div className="node-field">
          <label className="field-label">Decimals (0-9)</label>
          <input
            className="field-value"
            type="number"
            value={data.decimals ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              if (validateField('decimals', value)) {
                updateNodeData({ decimals: Number(value) });
              }
            }}
            min="0"
            max="9"
          />
          {errors.decimals && <div className="error-message">{errors.decimals}</div>}
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
                updateNodeData({ initialSupply: Number(value) });
              }
            }}
            min="1"
            max="1000000000"
            step="1"
            placeholder="1000000"
          />
          {errors.initialSupply && (
            <div className="error-message">{errors.initialSupply}</div>
          )}
        </div>

        <div className="node-field">
          <label className="field-label">Mint Authority</label>
          <div className="creator-item">
            <span
              className="creator-address"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              {data.mintAuthority ? 
                `${data.mintAuthority.slice(0,4)}...${data.mintAuthority.slice(-4)}` : 
                'Not set'
              }
              {showTooltip && data.mintAuthority && (
                <div className="creator-tooltip">
                  {data.mintAuthority}
                </div>
              )}
            </span>
          </div>
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
      </div>

      <Handle type="source" position="bottom" />
    </div>
  );
}

TokenNode.propTypes = tokenNodeProps;