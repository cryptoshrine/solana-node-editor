import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import MainCanvas from './components/Canvas/MainCanvas';
import AIChat from './components/ai/AIChat';
import ValidatorStatus from './components/Canvas/ValidatorStatus';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

const wallets = [new PhantomWalletAdapter()];
const network = process.env.REACT_APP_SOLANA_NETWORK || 'localhost';

export default function App() {
  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <ReactFlowProvider>
          <div className="app-container">
            <ValidatorStatus />
            <AIChat />
            <MainCanvas />
          </div>
        </ReactFlowProvider>
      </WalletModalProvider>
    </WalletProvider>
  );
}
