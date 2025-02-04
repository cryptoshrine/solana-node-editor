// deepseek-solana-node-editor/solana-node-editor/frontend/src/components/Navigation.js

import React from 'react';

const Navigation = ({ onAddNode }) => {
  const navItems = [
    { id: 'account', label: 'ACCOUNT' },
    { id: 'token', label: 'TOKEN' },
    { id: 'nft', label: 'NFT' },
    { id: 'dao', label: 'DAO' },
    { id: 'mint', label: 'MINT' }
  ];

  return (
    <nav className="main-nav">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-button ${item.id}-button`}
          onClick={() => onAddNode(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;