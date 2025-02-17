import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position, useEdges, useNodes } from 'reactflow';
import { useNodeData } from '../../hooks/useNodeData';
import useWallet from '../../hooks/useWallet';
import { useSolana } from '../../hooks/useSolana';
import toast from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import { PublicKey } from '@solana/web3.js';
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

const DAONodeContent = ({ id, data, onNodeDataChange }) => {
  const { validateAddress } = useSolana();
  const { connected, publicKey } = useWallet();
  const edges = useEdges();
  const nodes = useNodes();
  const [nodeData, setNodeData] = useState(data);
  const nodeRef = useRef(null);
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [proposalDescription, setProposalDescription] = useState('');

  // Update state and notify parent
  const updateNodeData = useCallback((newData) => {
    setNodeData(prev => {
      const updated = { ...prev, ...newData };
      // Notify parent component of changes
      if (onNodeDataChange) {
        onNodeDataChange(id, updated);
      }
      return updated;
    });
  }, [id, onNodeDataChange]);

  // Sync with parent data when it changes
  useEffect(() => {
    console.log('Parent data changed:', data);
    updateNodeData(data);
  }, [data, updateNodeData]);

  // Debug edges whenever they change
  useEffect(() => {
    console.log('Edge/Node Debug:', {
      edges,
      nodes,
      currentNodeId: id,
      currentCommunityMint: nodeData.communityMint,
      status: nodeData.status,
      parentData: data,
      nodeDataRef: nodeRef.current
    });
  }, [edges, nodes, id, nodeData, data]);

  // Handle edge connections
  useEffect(() => {
    if (!edges?.length) {
      console.log('No edges found');
      // Only reset if the DAO is not active
      if (nodeData.communityMint && 
          nodeData.status !== 'active' && 
          nodeData.communityMint !== '[TOKEN_MINT_ADDRESS]') {
        console.log('Resetting community mint - no edges');
        updateNodeData({
          communityMint: '',
          status: 'pending'
        });
      }
      return;
    }

    // Find connected token node
    const tokenConnection = edges.find(edge => 
      edge.target === id && edge.targetHandle === 'communityMint'
    );

    console.log('Token connection:', tokenConnection);

    if (!tokenConnection) {
      console.log('No token connection found');
      // Only reset if the DAO is not active
      if (nodeData.communityMint && nodeData.status !== 'active') {
        console.log('Resetting community mint - no token connection');
        updateNodeData({
          communityMint: '',
          status: 'pending'
        });
      }
      return;
    }

    // Get connected node
    const tokenNode = nodes.find(n => n.id === tokenConnection.source);
    console.log('Found token node:', tokenNode);

    if (tokenNode?.data?.mint) {
      const mintAddress = tokenNode.data.mint;
      console.log('Token mint address:', mintAddress);
      
      // Update if:
      // 1. DAO is not active AND
      // 2. New mint address is different from current AND
      // 3. Mint address is valid
      if (nodeData.status !== 'active' && 
          mintAddress !== nodeData.communityMint && 
          validateAddress(mintAddress)) {
        console.log('Updating community mint to:', mintAddress);
        updateNodeData({
          communityMint: mintAddress,
          status: 'pending'
        });
      } else {
        console.log('Not updating community mint because:', {
          isActive: nodeData.status === 'active',
          sameAddress: mintAddress === nodeData.communityMint,
          isValidAddress: validateAddress(mintAddress),
          currentMint: nodeData.communityMint,
          newMint: mintAddress
        });
      }
    } else {
      console.log('No mint address found in token node:', tokenNode);
    }
  }, [edges, nodes, id, nodeData.status, validateAddress, updateNodeData]);

  // Initialize defaults only once on mount
  useEffect(() => {
    if (!nodeData.votingThreshold) {
      updateNodeData({
        votingThreshold: 51,
        maxVotingTime: 432000, // 5 days
        holdUpTime: 86400, // 1 day
        status: 'pending'
      });
    }
  }, []);

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
    const errors = [];
    
    if (!nodeData.name?.trim()) {
      errors.push('DAO name is required');
    }

    if (!nodeData.communityMint) {
      errors.push('Token mint is required');
    } else if (
      nodeData.communityMint === '[TOKEN_MINT_ADDRESS]' || 
      nodeData.communityMint === '[MSIG_TOKEN_MINT_ADDRESS]'
    ) {
      errors.push('Please connect a valid token mint');
    } else {
      try {
        new PublicKey(nodeData.communityMint);
      } catch (error) {
        errors.push('Invalid token mint address format');
      }
    }

    if (typeof nodeData.votingThreshold !== 'number') {
      errors.push('Voting threshold must be a number');
    } else if (nodeData.votingThreshold < 1 || nodeData.votingThreshold > 100) {
      errors.push('Voting threshold must be between 1-100%');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }

    return true;
  };

  const handleCreateDAO = useCallback(async () => {
    console.log('Starting DAO creation process...', {
      nodeData,
      connected,
      publicKey: publicKey?.toString()
    });

    if (!validateForm()) {
      console.log('Form validation failed', { errors });
      return;
    }
    
    if (!connected || !publicKey) {
      console.log('Wallet not connected', { connected, publicKey });
      toast.error('Please connect your wallet first');
      return;
    }

    const toastId = toast.loading('Creating DAO...');
    console.log('Preparing DAO creation request...', {
      name: nodeData.name,
      communityMint: nodeData.communityMint,
      votingThreshold: nodeData.votingThreshold,
      maxVotingTime: nodeData.maxVotingTime,
      holdUpTime: nodeData.holdUpTime,
      authority: publicKey.toString()
    });

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      console.log('Sending request to:', `${apiUrl}/api/solana/create-dao`);
      
      const response = await fetch(`${apiUrl}/api/solana/create-dao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nodeData.name.trim(),
          communityMint: nodeData.communityMint,
          votingThreshold: nodeData.votingThreshold,
          maxVotingTime: nodeData.maxVotingTime,
          holdUpTime: nodeData.holdUpTime,
          authority: publicKey.toString()
        }),
      });

      console.log('Received response:', {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('DAO creation failed:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('DAO creation successful:', result);
      
      // Update node data with success status and DAO information
      const updatedData = {
        ...nodeData,
        address: result.address,
        status: 'active',
        explorerUrl: result.explorerUrl,
        name: result.name
      };
      console.log('Updating node data with:', updatedData);
      
      // Update local state
      setNodeData(updatedData);

      // Notify parent component of changes
      if (onNodeDataChange) {
        console.log('Notifying parent of node data change');
        onNodeDataChange(id, updatedData);
      }

      toast.success('DAO created successfully!', { id: toastId });
      
    } catch (error) {
      console.error('DAO Creation Error:', {
        error,
        message: error.message,
        stack: error.stack,
        nodeData
      });
      toast.error(`Failed to create DAO: ${error.message}`, { id: toastId });
    }
  }, [nodeData, connected, publicKey, onNodeDataChange, id, validateForm]);

  const handleCreateProposal = useCallback(async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!proposalDescription.trim()) {
      toast.error('Please enter a proposal description');
      return;
    }

    const toastId = toast.loading('Creating proposal...');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/solana/create-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daoAddress: nodeData.address,
          description: proposalDescription.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setProposals(prev => [...prev, result]);
      setProposalDescription('');
      setIsCreatingProposal(false);
      
      toast.success('Proposal created successfully!', { id: toastId });
      
    } catch (error) {
      console.error('Proposal Creation Error:', error);
      toast.error(`Failed to create proposal: ${error.message}`, { id: toastId });
    }
  }, [nodeData.address, proposalDescription, connected, publicKey]);

  const handleVote = useCallback(async (proposalAddress, voteType) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    const toastId = toast.loading('Casting vote...');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/solana/cast-vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daoAddress: nodeData.address,
          proposalAddress,
          voteType,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setProposals(prev => 
        prev.map(p => 
          p.address === proposalAddress 
            ? { 
                ...p, 
                forVotes: result.forVotes,
                againstVotes: result.againstVotes,
                status: result.proposalStatus 
              }
            : p
        )
      );
      
      toast.success('Vote cast successfully!', { id: toastId });
      
    } catch (error) {
      console.error('Vote Casting Error:', error);
      toast.error(`Failed to cast vote: ${error.message}`, { id: toastId });
    }
  }, [nodeData.address, connected, publicKey]);

  const handleExecuteProposal = useCallback(async (proposalAddress) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    const toastId = toast.loading('Executing proposal...');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/solana/execute-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daoAddress: nodeData.address,
          proposalAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setProposals(prev => 
        prev.map(p => 
          p.address === proposalAddress 
            ? { ...p, status: result.status }
            : p
        )
      );
      
      toast.success('Proposal executed successfully!', { id: toastId });
      
    } catch (error) {
      console.error('Proposal Execution Error:', error);
      toast.error(`Failed to execute proposal: ${error.message}`, { id: toastId });
    }
  }, [nodeData.address, connected, publicKey]);

  return (
    <div className="dao-node" ref={nodeRef}>
      <Handle
        type="target"
        position={Position.Left}
        id="communityMint"
        style={{ background: '#555' }}
      />
      
      <div className="dao-content">
        <div className="dao-header">
          <h3>DAO Node</h3>
          {nodeData.status === 'active' && (
            <div className="dao-status">
              <span className="status-badge">Active</span>
            </div>
          )}
        </div>
        
        <div className="dao-form">
          {nodeData.status === 'active' ? (
            <>
              <div className="field">
                <label>DAO Name</label>
                <div className="field-value">{nodeData.name}</div>
              </div>
              <div className="field">
                <label>Voting Threshold</label>
                <div className="field-value">{nodeData.votingThreshold}%</div>
              </div>
              <div className="field">
                <label>Community Token</label>
                <div className="field-value">{nodeData.communityMint}</div>
              </div>
              <div className="field">
                <label>DAO Address</label>
                <div className="field-value">
                  {nodeData.address}
                  <button 
                    className="copy-button"
                    onClick={() => {
                      if (nodeData.address) {
                        navigator.clipboard.writeText(nodeData.address);
                        toast.success('Address copied to clipboard!');
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              {nodeData.explorerUrl && (
                <div className="explorer-link">
                  <a href={nodeData.explorerUrl} target="_blank" rel="noopener noreferrer">
                    View on Explorer
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="input-group">
                <label htmlFor="daoName">DAO Name</label>
                <input
                  id="daoName"
                  type="text"
                  placeholder="Enter DAO name"
                  value={nodeData.name || ''}
                  onChange={(e) => updateNodeData({ name: e.target.value })}
                  disabled={nodeData.status === 'active'}
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="votingThreshold">Voting Threshold (%)</label>
                <input
                  id="votingThreshold"
                  type="number"
                  placeholder="Enter threshold (1-100)"
                  value={nodeData.votingThreshold || ''}
                  onChange={(e) => updateNodeData({ 
                    votingThreshold: parseInt(e.target.value) 
                  })}
                  min="1"
                  max="100"
                  disabled={nodeData.status === 'active'}
                />
              </div>

              {nodeData.communityMint && nodeData.communityMint !== '[TOKEN_MINT_ADDRESS]' && (
                <div className="mint-address connected">
                  <label>Community Token</label>
                  <span className="address">{nodeData.communityMint}</span>
                </div>
              )}
              
              {nodeData.status === 'pending' && (
                <button 
                  className="create-dao-btn"
                  onClick={handleCreateDAO}
                  disabled={!connected || !nodeData.communityMint || nodeData.communityMint === '[TOKEN_MINT_ADDRESS]'}
                >
                  {!connected ? 'Connect Wallet' : 'Create DAO'}
                </button>
              )}
            </>
          )}
        </div>

        {nodeData.status === 'active' && (
          <div className="dao-info">
            <div className="proposals-section">
              <h4>Proposals</h4>
              
              {isCreatingProposal ? (
                <div className="create-proposal">
                  <textarea
                    placeholder="Enter proposal description"
                    value={proposalDescription}
                    onChange={(e) => setProposalDescription(e.target.value)}
                    className="proposal-input"
                  />
                  <div className="proposal-actions">
                    <button className="submit-btn" onClick={handleCreateProposal}>Submit</button>
                    <button className="cancel-btn" onClick={() => setIsCreatingProposal(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="new-proposal-btn" onClick={() => setIsCreatingProposal(true)}>
                  New Proposal
                </button>
              )}

              <div className="proposals-list">
                {proposals.map(proposal => (
                  <div key={proposal.address} className="proposal-item">
                    <h5>{proposal.description}</h5>
                    <div className="proposal-status">
                      Status: <span className={`status-${proposal.status.toLowerCase()}`}>{proposal.status}</span>
                    </div>
                    <div className="vote-counts">
                      <div className="vote-bar">
                        <div 
                          className="for-votes" 
                          style={{width: `${(proposal.forVotes / (proposal.forVotes + proposal.againstVotes)) * 100}%`}}
                        />
                      </div>
                      <div className="vote-numbers">
                        For: {proposal.forVotes} Against: {proposal.againstVotes}
                      </div>
                    </div>
                    
                    {proposal.status === 'Active' && (
                      <div className="vote-buttons">
                        <button className="vote-for" onClick={() => handleVote(proposal.address, { for: {} })}>
                          Vote For
                        </button>
                        <button className="vote-against" onClick={() => handleVote(proposal.address, { against: {} })}>
                          Vote Against
                        </button>
                      </div>
                    )}
                    
                    {proposal.status === 'Succeeded' && (
                      <button className="execute-btn" onClick={() => handleExecuteProposal(proposal.address)}>
                        Execute
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

DAONodeContent.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  onNodeDataChange: PropTypes.func
};

const DAONode = (props) => (
  <ErrorBoundary
    fallback={<div>Something went wrong with this node.</div>}
    onError={(error) => console.error('DAONode Error:', error)}
  >
    <DAONodeContent {...props} />
  </ErrorBoundary>
);

export default DAONode;
