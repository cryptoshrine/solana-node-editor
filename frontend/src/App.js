// deepseek-solana-node-editor/solana-node-editor/frontend/src/App.js

import React, { useState, useCallback, useMemo } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';
import MainCanvas from './components/Canvas/MainCanvas';
import AIChat from './components/ai/AIChat';
import ValidatorStatus from './components/Canvas/ValidatorStatus';
import Navigation from './components/Navigation';
import { useEffect } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [error, setError] = useState(null);

  const handleEdgesChange = useCallback((newEdges) => {
    setEdges(newEdges);
  }, []);

  const handleAddNode = useCallback((type) => {
    try {
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position: { 
          x: Math.random() * 500,
          y: Math.random() * 500
        },
        data: { label: `${type.toUpperCase()} Node` }
      };
      setNodes(nds => [...nds, newNode]);
      setError(null);
    } catch (err) {
      setError(`Node creation failed: ${err.message}`);
    }
  }, []);

  const handleAIResponse = useCallback((result) => {
    if (result?.nodes) {
      console.log('Raw AI nodes:', JSON.stringify(result.nodes, null, 2));
      
      const formattedNodes = result.nodes.map((node, index) => {
        console.log('Processing node:', JSON.stringify(node, null, 2));
        
        // Get the node data from either data or parameters field
        const nodeData = node.data || node.parameters || {};
        
        const baseNode = {
          id: node.id || `${node.type}-${Date.now()}-${index}`,
          type: node.type.toLowerCase().replace(/^create[-_]?/, ''),
          position: { 
            x: Math.random() * 500 + 100,
            y: Math.random() * 300 + 100
          },
          style: {
            width: 180,
            padding: 10
          }
        };

        // Add type-specific data
        switch (baseNode.type) {
          case 'nft':
            return {
              ...baseNode,
              data: {
                uri: nodeData.uri || '',
                royalties: parseInt(nodeData.royalties) || 0,
                creators: Array.isArray(nodeData.creators) ? nodeData.creators.map(creator => ({
                  address: creator.address || '',
                  share: parseInt(creator.share) || 0
                })) : [],
                label: `NFT: ${nodeData.uri?.split('/').pop() || 'Untitled'}`
              }
            };
          case 'token':
            return {
              ...baseNode,
              data: {
                name: nodeData.name || '',
                symbol: nodeData.symbol || '',
                decimals: parseInt(nodeData.decimals) || 0,
                mintAuthority: nodeData.mintAuthority || '',
                initialSupply: parseInt(nodeData.initialSupply) || undefined,
                label: nodeData.name || 'Token Node'
              }
            };
          default:
            return {
              ...baseNode,
              data: {
                ...nodeData,
                label: nodeData.name || `${baseNode.type} Node`
              }
            };
        }
      });
      
      console.log('Formatted nodes:', JSON.stringify(formattedNodes, null, 2));
      setNodes(currentNodes => [...currentNodes, ...formattedNodes]);
    }
    
    if (result?.connections) {
      const formattedEdges = result.connections.map((connection, index) => {
        const [source, target] = connection.split('->').map(id => id.trim());
        return {
          id: `edge-${Date.now()}-${index}`,
          source,
          target,
          type: 'smoothstep',
          animated: true
        };
      });
      
      setEdges(currentEdges => [...currentEdges, ...formattedEdges]);
    }
  }, [setNodes]);

  return (
    <div className="app-container">
      {error && <div className="error-banner">{error}</div>}
      
      <div className="header">
        <h1>Solana Node Editor</h1>
        <button 
          className="new-program-btn"
          onClick={() => {
            setNodes([]);
            setEdges([]);
          }}
        >
          + New Program
        </button>
      </div>

      <Navigation onAddNode={handleAddNode} />
      <ValidatorStatus />
      <AIChat onResponse={handleAIResponse} />
      <MainCanvas 
        nodes={nodes} 
        edges={edges}
        onNodesChange={setNodes}
        onEdgesChange={handleEdgesChange}
      />
    </div>
  );
}

function AppWrapper() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ReactFlowProvider>
            <App />
          </ReactFlowProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default AppWrapper;