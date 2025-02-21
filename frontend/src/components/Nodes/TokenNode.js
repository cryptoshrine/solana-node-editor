import React, { useState, useLayoutEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Handle } from 'reactflow';
import { useNodeData } from '../../hooks/useNodeData';
import { tokenNodeProps } from '../../propTypes/nodeTypes';
import { createToken } from '../../api/solana';
import useWallet from '../../hooks/useWallet';
import './TokenNode.css';
import { toast } from 'react-toastify';

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

  const validateForm = () => {
    const fields = ['symbol', 'decimals', 'initialSupply'];
    let isValid = true;

    fields.forEach((field) => {
      const value = data[field];
      if (!validateField(field, value)) {
        isValid = false;
      }
    });

    return isValid;
  };

  const handleCreateToken = async () => {
    if (!validateForm()) return;
    
    try {
      const response = await fetch('/api/solana/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create token');
      }

      // Update node data with the mint address and transaction info
      updateNodeData({
        ...data,
        mint: result.token.mint,
        txSignature: result.token.txId,
        explorerUrl: result.token.explorerUrl,
        status: 'created'
      });

      // Notify parent of the update
      updateNodeData({
        ...data,
        mint: result.token.mint,
        txSignature: result.token.txId,
        explorerUrl: result.token.explorerUrl,
        status: 'created'
      });

    } catch (error) {
      console.error('Token Creation Error:', error);
      alert(`Failed to create token: ${error.message}`);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Mint address copied!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy address');
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
            disabled={!connected || Object.keys(errors).length > 0}
            onClick={handleCreateToken}
          >
            Create Token
          </button>
        </div>

        {data.mint && (
          <div className="token-info">
            <div className="token-details">
              <div className="token-detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{data.name}</span>
              </div>
              <div className="token-detail-row">
                <span className="detail-label">Symbol:</span>
                <span className="detail-value">{data.symbol}</span>
              </div>
              <div className="token-detail-row">
                <span className="detail-label">Supply:</span>
                <span className="detail-value">{data.initialSupply}</span>
              </div>
              <div className="token-detail-row">
                <span className="detail-label">Decimals:</span>
                <span className="detail-value">{data.decimals}</span>
              </div>
              <div className="token-detail-row">
                <span className="detail-label">Mint:</span>
                <span 
                  className="detail-value mint-address"
                  onClick={() => copyToClipboard(data.mint)}
                  title="Click to copy"
                >
                  {`${data.mint.slice(0, 4)}...${data.mint.slice(-4)}`}
                </span>
              </div>
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
      {data.mint && (
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
          <div style={{ display: 'none' }} data-mintaddress={data.mint} />
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