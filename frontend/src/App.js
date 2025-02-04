// deepseek-solana-node-editor/solana-node-editor/frontend/src/App.js

import React, { useState, useCallback, useMemo } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';
import MainCanvas from './components/Canvas/MainCanvas';
import AIChat from './components/ai/AIChat';
import ValidatorStatus from './components/Canvas/ValidatorStatus';
import Navigation from './components/Navigation';

const network = WalletAdapterNetwork.Devnet;

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
      <AIChat />
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
  const endpoint = useMemo(() => clusterApiUrl(network), []);
  const wallets = useMemo(() => [], []);

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