import React, { useState, useLayoutEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Handle } from 'reactflow';
import { useNodeData } from '../../hooks/useNodeData';
import { tokenNodeProps } from '../../propTypes/nodeTypes';
import { createToken } from '../../api/solana';
import useWallet from '../../hooks/useWallet';
import './TokenNode.css';

export default function TokenNode({ id, data }) {
  const { updateNodeData } = useNodeData(id);
  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const { connected } = useWallet();
  const nodeRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Use layout effect to ensure node is properly sized
  useLayoutEffect(() => {
    if (nodeRef.current) {
      let rafId;
      let lastUpdate = 0;
      const MIN_UPDATE_DELAY = 100; // Minimum time between updates in ms

      const resizeObserver = new ResizeObserver((entries) => {
        const now = Date.now();
        if (now - lastUpdate >= MIN_UPDATE_DELAY) {
          // Cancel any pending animation frame
          if (rafId) {
            window.cancelAnimationFrame(rafId);
          }

          // Schedule a new update
          rafId = window.requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
            lastUpdate = now;
          });
        }
      });

      resizeObserver.observe(nodeRef.current);
      
      return () => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
        resizeObserver.disconnect();
      };
    }
  }, []);

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
      const result = await createToken({
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        mintAuthority: data.mintAuthority,
        initialSupply: data.initialSupply
      });
      
      // Update node with token address
      updateNodeData({ 
        ...data,
        tokenAddress: result.token.mint,
        txId: result.token.txId,
        explorerUrl: result.token.explorerUrl
      });
      
    } catch (error) {
      console.error('Token creation error:', error);
      alert(`Failed to create token: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="node token-node" ref={nodeRef}>
      <Handle 
        type="target" 
        position="top"
        isConnectable={true}
        style={{ cursor: 'pointer' }}
      />
      
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

        {data.tokenAddress && (
          <div className="token-info">
            <div className="address-container">
              <span>Mint Address: </span>
              <span 
                className="truncated-address" 
                title={data.tokenAddress}
              >
                {`${data.tokenAddress.slice(0, 4)}...${data.tokenAddress.slice(-4)}`}
              </span>
            </div>
            <a 
              href={data.explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="explorer-link"
            >
              View on Explorer
            </a>
          </div>
        )}
      </div>

      {/* Fixed position output handle */}
      {data.tokenAddress && (
        <Handle
          type="source"
          position="right"
          id="mintAddress"
          isConnectable={true}
          isValidConnection={(connection) => {
            return connection.targetHandle === 'communityMint';
          }}
          style={{
            background: '#14F195',
            right: -8,
            width: 12,
            height: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            position: 'absolute',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'none' }} data-mintaddress={data.tokenAddress} />
        </Handle>
      )}

      <Handle 
        type="source" 
        position="bottom"
        isConnectable={true}
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
}

TokenNode.propTypes = tokenNodeProps;