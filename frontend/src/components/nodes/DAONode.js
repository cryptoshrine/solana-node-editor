import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position, useEdges } from 'reactflow';
import { useNodeData } from '../../hooks/useNodeData';
import useWallet from '../../hooks/useWallet';
import toast from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import './nodes.css';
import './DAONode.css';

const DAONodeContent = ({ id, data }) => {
  const { updateNodeData } = useNodeData(id);
  const [isCreating, setIsCreating] = useState(false);
  const { connected, publicKey } = useWallet();
  const [validationErrors, setValidationErrors] = useState({});
  const edges = useEdges();
  const nodeRef = useRef(null);

  // Improved useLayoutEffect block for ResizeObserver
  useLayoutEffect(() => {
    if (nodeRef.current) {
      let rafId;
      let lastUpdate = 0;
      const MIN_UPDATE_DELAY = 100;

      const handleResize = (entries) => {
        try {
          const now = Date.now();
          if (now - lastUpdate >= MIN_UPDATE_DELAY) {
            if (rafId) {
              window.cancelAnimationFrame(rafId);
            }
            rafId = window.requestAnimationFrame(() => {
              window.dispatchEvent(new Event('resize'));
              lastUpdate = now;
            });
          }
        } catch (e) {
          if (e.message.includes('ResizeObserver')) {
            // Silently handle ResizeObserver error
            return;
          }
          console.error('Resize handling error:', e);
        }
      };

      const resizeObserver = new ResizeObserver(handleResize);

      try {
        resizeObserver.observe(nodeRef.current);
      } catch (error) {
        console.warn('ResizeObserver setup failed:', error);
      }
      
      return () => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
        try {
          resizeObserver.disconnect();
        } catch (error) {
          console.warn('ResizeObserver cleanup failed:', error);
        }
      };
    }
  }, []);

  // Handle incoming connections and updates
  useEffect(() => {
    const incomingEdge = edges.find(edge => edge.target === id && edge.targetHandle === 'communityMint');
    
    if (!incomingEdge && data.communityMint) {
      console.log('Clearing DAO community mint - connection removed');
      updateNodeData({
        ...data,
        communityMint: ''
      });
      return;
    }

    if (incomingEdge) {
      const sourceNode = document.querySelector(`[data-id="${incomingEdge.source}"]`);
      if (sourceNode) {
        const mintAddressElement = sourceNode.querySelector('[data-mintaddress]');
        if (mintAddressElement) {
          const mintAddress = mintAddressElement.getAttribute('data-mintaddress');
          if (mintAddress && mintAddress !== data.communityMint) {
            console.log('Updating DAO community mint:', mintAddress);
            updateNodeData({
              ...data,
              communityMint: mintAddress
            });
          }
        }
      }
    }
  }, [edges, id, data, updateNodeData]);

  // Initialize default values
  useEffect(() => {
    if (!data.votingThreshold) {
      updateNodeData({
        ...data,
        votingThreshold: 15,
        maxVotingTime: 432000,
        holdUpTime: 86400,
        status: 'draft'
      });
    }
  }, [data, updateNodeData]);

  const validateForm = () => {
    const errors = {};
    if (!data.name?.trim()) errors.name = 'DAO name required';
    if (!data.communityMint) errors.communityMint = 'Token mint required';
    if (data.votingThreshold < 1 || data.votingThreshold > 100) {
      errors.votingThreshold = 'Must be 1-100%';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateDAO = useCallback(async () => {
    if (!validateForm()) return;
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading('Creating DAO...');

    try {
      const response = await fetch('http://localhost:3001/api/solana/create-dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          communityMint: data.communityMint,
          votingThreshold: data.votingThreshold,
          maxVotingTime: data.maxVotingTime,
          holdUpTime: data.holdUpTime,
          authority: publicKey.toBase58()
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create DAO');
      }

      updateNodeData({
        ...data,
        daoAddress: responseData.daoAddress,
        txSignature: responseData.txSignature,
        status: 'created',
        explorerUrl: `https://explorer.solana.com/tx/${responseData.txSignature}`
      });

      toast.success('DAO created successfully!', { id: toastId });
    } catch (error) {
      console.error('DAO Creation Error:', error);
      toast.error(`Failed to create DAO: ${error.message}`, { id: toastId });
    } finally {
      setIsCreating(false);
    }
  }, [connected, data, publicKey, updateNodeData, validateForm]);

  return (
    <div className="node dao-node" ref={nodeRef}>
      <Handle
        type="target"
        position="left"
        id="communityMint"
        isConnectable={true}
        isValidConnection={(connection) => connection.sourceHandle === 'mintAddress'}
        style={{ background: '#9c27b0', cursor: 'pointer' }}
      />
      
      <div className="node-content">
        <h3>DAO Node</h3>
        <input
          type="text"
          value={data.name || ''}
          onChange={(e) => updateNodeData({ ...data, name: e.target.value })}
          placeholder="DAO Name"
          className={validationErrors.name ? 'error' : ''}
        />
        
        <div className="mint-address">
          <label>Community Token:</label>
          <span className="address" title={data.communityMint || 'Connect a token'}>
            {data.communityMint ? 
              `${data.communityMint.slice(0, 4)}...${data.communityMint.slice(-4)}` : 
              'Connect token mint'}
          </span>
        </div>

        <div className="voting-params">
          <label>Voting Threshold (%):</label>
          <input
            type="number"
            value={data.votingThreshold || ''}
            onChange={(e) => updateNodeData({ ...data, votingThreshold: parseInt(e.target.value) })}
            min="1"
            max="100"
            className={validationErrors.votingThreshold ? 'error' : ''}
          />
        </div>

        <button 
          onClick={handleCreateDAO}
          disabled={isCreating || !connected || !data.communityMint}
          className="create-dao-btn"
        >
          {isCreating ? 'Creating DAO...' : 'Create DAO'}
        </button>

        {data.status === 'created' && data.daoAddress && (
          <div className="dao-info">
            <p>DAO Address: {data.daoAddress.slice(0, 4)}...{data.daoAddress.slice(-4)}</p>
            <a href={data.explorerUrl} target="_blank" rel="noopener noreferrer">
              View on Explorer
            </a>
          </div>
        )}
      </div>

      <Handle type="source" position="right" isConnectable={true} style={{ cursor: 'pointer' }} />
    </div>
  );
};

// Wrap component with ErrorBoundary
const DAONode = (props) => (
  <ErrorBoundary
    fallback={<div className="node dao-node error">DAO Node Error</div>}
    onError={(error) => {
      if (error.message.includes('ResizeObserver')) return;
      console.error('DAONode Error:', error);
    }}
  >
    <DAONodeContent {...props} />
  </ErrorBoundary>
);

DAONode.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.object
};

export default DAONode;
