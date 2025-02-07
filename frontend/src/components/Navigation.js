import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

const Navigation = ({ onAddNode }) => {
  const { publicKey, connect, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const navItems = [
    { id: 'account', label: 'ACCOUNT', emoji: '🏦' },
    { id: 'token', label: 'TOKEN', emoji: '🪙' },
    { id: 'nft', label: 'NFT', emoji: '🖼' },
    { id: 'dao', label: 'DAO', emoji: '🏛' },
    { id: 'mint', label: 'MINT', emoji: '➕' }
  ];

  const handleConnect = async () => {
    try {
      if (!publicKey) {
        setVisible(true);
      }
    } catch (error) {
      if (error instanceof WalletNotConnectedError) {
        setVisible(true);
      } else {
        console.error('Connection failed:', error);
      }
    }
  };

  return (
    <nav className="main-nav">
      <div className="node-buttons">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-button ${item.id}-button`}
            onClick={() => onAddNode(item.id)}
            title={`Add ${item.label} Node`}
          >
            {item.emoji} {item.label}
          </button>
        ))}
      </div>
      
      <div className="wallet-section">
        {publicKey ? (
          <button 
            className="wallet-button connected"
            onClick={disconnect}
          >
            {`${publicKey.toBase58().slice(0,4)}...${publicKey.toBase58().slice(-4)}`}
          </button>
        ) : (
          <button
            className="wallet-button"
            onClick={handleConnect}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="wallet-icon">
              <path fill="currentColor" d="M13.95 22H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.95c-.16-.06-.32-.12-.5-.17.34-.15.5-.33.5-.78V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h7.95l1 1M23 17.5V21h-2v-2h-2v-1.5h2v-2h2v2h2v1.5h-2m-5.07-3.43A5.49 5.49 0 0 1 22.5 16V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h9.5a5.5 5.5 0 0 1 3.43-7.93Z"/>
            </svg>
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navigation;