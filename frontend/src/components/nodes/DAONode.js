import React, { useState, useCallback, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position, useEdges, useNodes } from 'reactflow';
import { useNodeData } from '../../hooks/useNodeData';
import useWallet from '../../hooks/useWallet';
import { useSolana } from '../../hooks/useSolana';
import toast from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import { PublicKey } from '@solana/web3.js';  // Properly import PublicKey
import './nodes.css';
import './DAONode.css';

// Add debounce utility
const debounce = (fn, delay = 500) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

const DAONodeContent = ({ id, data }) => {
  const { validateAddress } = useSolana();
  const { connected, publicKey } = useWallet();
  const edges = useEdges();
  const nodes = useNodes();
  const [nodeData, setNodeData] = useState(data);
  const nodeRef = useRef(null);
  const prevMintRef = useRef(nodeData.communityMint);

  // Debug edges whenever they change
  useEffect(() => {
    console.log('Current edges:', edges);
    console.log('Current nodes:', nodes);
  }, [edges, nodes]);

  // Handle edge connections
  useEffect(() => {
    // Debug current state
    console.log('Checking edges:', edges?.length, 'Current mint:', nodeData.communityMint);

    if (!edges?.length) {
      if (nodeData.communityMint && nodeData.communityMint !== '[TOKEN_MINT_ADDRESS]') {
        console.log('No edges, resetting community mint');
        setNodeData(prev => ({
          ...prev,
          communityMint: '',
          status: 'pending'
        }));
      }
      return;
    }

    // Find connected token node
    const tokenConnection = edges.find(edge => {
      console.log('Checking edge:', edge);
      return edge.source !== id && edge.target === id && edge.targetHandle === 'communityMint';
    });

    if (!tokenConnection) {
      console.log('No token connection found');
      if (nodeData.communityMint) {
        setNodeData(prev => ({
          ...prev,
          communityMint: '',
          status: 'pending'
        }));
      }
      return;
    }

    console.log('Found token connection:', tokenConnection);

    // Get connected node
    const tokenNode = nodes.find(n => n.id === tokenConnection.source);

    console.log('Token node:', tokenNode);

    if (tokenNode?.data?.mint) {
      const mintAddress = tokenNode.data.mint;
      console.log('Found mint address:', mintAddress);

      if (mintAddress !== nodeData.communityMint && validateAddress(mintAddress)) {
        console.log('Updating community mint to:', mintAddress);
        setNodeData(prev => ({
          ...prev,
          communityMint: mintAddress,
          status: 'pending'
        }));
      }
    }
  }, [edges, nodes, id, nodeData.communityMint, validateAddress]);

  // Initialize defaults only once on mount
  useEffect(() => {
    if (!nodeData.votingThreshold) {
      setNodeData(prev => ({
        ...prev,
        votingThreshold: 15,
        maxVotingTime: 432000,
        holdUpTime: 86400,
        status: 'pending'
      }));
    }
  }, []); // Empty dependency array for initialization

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

  const validateForm = () => {
    console.log('Starting form validation with data:', nodeData);
    const errors = [];
    
    // Validate DAO name
    if (!nodeData.name?.trim()) {
      console.log('DAO name validation failed: empty name');
      errors.push('DAO name is required');
    }

    // Validate community mint
    if (!nodeData.communityMint) {
      console.log('Community mint validation failed: no mint address');
      errors.push('Token mint is required');
    } else if (
      nodeData.communityMint === '[TOKEN_MINT_ADDRESS]' || 
      nodeData.communityMint === '[MSIG_TOKEN_MINT_ADDRESS]'
    ) {
      console.log('Community mint validation failed: placeholder address');
      errors.push('Please connect a valid token mint');
    } else {
      try {
        // Attempt to create PublicKey to validate format
        const mintPubkey = new PublicKey(nodeData.communityMint);
        console.log('Community mint validation passed:', mintPubkey.toBase58());
      } catch (error) {
        console.log('Community mint validation failed:', error.message);
        errors.push('Invalid token mint address format');
      }
    }

    // Validate voting threshold
    if (typeof nodeData.votingThreshold !== 'number') {
      console.log('Voting threshold validation failed: not a number');
      errors.push('Voting threshold must be a number');
    } else if (nodeData.votingThreshold < 1 || nodeData.votingThreshold > 100) {
      console.log('Voting threshold validation failed: out of range');
      errors.push('Voting threshold must be between 1-100%');
    } else {
      console.log('Voting threshold validation passed:', nodeData.votingThreshold);
    }
    
    // Display errors if any
    if (errors.length > 0) {
      console.log('Form validation failed with errors:', errors);
      errors.forEach(error => toast.error(error));
      return false;
    }

    console.log('Form validation passed');
    return true;
  };

  const handleCreateDAO = useCallback(async () => {
    console.log('handleCreateDAO called');
    console.log('Current nodeData:', nodeData);
    console.log('Wallet status:', { connected, publicKey: publicKey?.toString() });

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    if (!connected || !publicKey) {
      console.log('Wallet not connected');
      toast.error('Please connect your wallet first');
      return;
    }

    const toastId = toast.loading('Creating DAO...');
    console.log('Started DAO creation with toast ID:', toastId);

    try {
      // Get the API URL from environment variable or default
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      // Log the current state before making the request
      const requestData = {
        name: nodeData.name.trim(),
        communityMint: nodeData.communityMint,
        votingThreshold: parseInt(nodeData.votingThreshold),
        maxVotingTime: nodeData.maxVotingTime || 432000, // 5 days default
        holdUpTime: nodeData.holdUpTime || 86400, // 1 day default
        authority: publicKey.toString()
      };

      console.log('Preparing DAO creation request:', requestData);

      if (!nodeData.communityMint || nodeData.communityMint === '[TOKEN_MINT_ADDRESS]') {
        console.log('Invalid community mint:', nodeData.communityMint);
        throw new Error('Please connect a valid token mint first');
      }

      console.log('Sending DAO creation request to:', `${apiUrl}/api/solana/create-dao`);
      
      const response = await fetch(`${apiUrl}/api/solana/create-dao`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      console.log('Received response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
      } catch (error) {
        console.error('Failed to parse response:', error);
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        console.error('Server error response:', responseData);
        throw new Error(responseData.error || `Server error: ${response.status}`);
      }

      if (!responseData.success) {
        console.error('DAO creation failed:', responseData);
        throw new Error(responseData.error || 'DAO creation failed');
      }

      if (!responseData.realmAddress || !responseData.txId) {
        console.error('Missing required fields in response:', responseData);
        throw new Error('Invalid server response: missing required fields');
      }

      console.log('DAO creation successful:', responseData);

      const newState = {
        ...nodeData,
        daoAddress: responseData.realmAddress,
        txSignature: responseData.txId,
        status: 'created',
        explorerUrl: responseData.explorerUrl || 
          `https://explorer.solana.com/tx/${responseData.txId}?cluster=${process.env.REACT_APP_SOLANA_NETWORK || 'devnet'}`
      };

      console.log('Updating node state to:', newState);
      setNodeData(newState);

      toast.success('DAO created successfully!', { id: toastId });
      
      console.log('DAO creation completed successfully');

    } catch (error) {
      console.error('DAO Creation Error:', error);
      console.error('Error stack:', error.stack);
      toast.error(`Failed to create DAO: ${error.message}`, { id: toastId });
      
      setNodeData(prev => {
        const newState = {
          ...prev,
          status: 'error',
          error: error.message
        };
        console.log('Updating node state after error:', newState);
        return newState;
      });
    }
  }, [connected, publicKey, nodeData, validateForm]);

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
          value={nodeData.name || ''}
          onChange={(e) => setNodeData({ ...nodeData, name: e.target.value })}
          placeholder="DAO Name"
        />
        
        <div className="mint-address">
          <label>Community Token:</label>
          <span className="address" title={nodeData.communityMint || 'Connect a token'}>
            {nodeData.communityMint 
              ? `${nodeData.communityMint.slice(0, 4)}...${nodeData.communityMint.slice(-4)}` 
              : 'Connect token mint'}
          </span>
        </div>

        <div className="voting-params">
          <label>Voting Threshold (%):</label>
          <input
            type="number"
            value={nodeData.votingThreshold || ''}
            onChange={(e) => setNodeData({ ...nodeData, votingThreshold: parseInt(e.target.value) })}
            min="1"
            max="100"
          />
        </div>

        <button 
          onClick={() => {
            console.log('Create DAO button clicked');
            handleCreateDAO();
          }}
          disabled={!connected || !nodeData.communityMint}
          className="create-dao-btn"
        >
          Create DAO
        </button>

        {nodeData.status === 'created' && nodeData.daoAddress && (
          <div className="dao-info">
            <p>DAO Address: {nodeData.daoAddress.slice(0, 4)}...{nodeData.daoAddress.slice(-4)}</p>
            <a href={nodeData.explorerUrl} target="_blank" rel="noopener noreferrer">
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
