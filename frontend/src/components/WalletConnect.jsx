// frontend/src/components/WalletConnect.jsx
import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { checkNetworkStatus, mintNFT } from '../api/solana';

export default function WalletConnect() {
  const { publicKey, connected } = useWallet();
  
  // New web3 connection handler
  const handleConnected = useCallback(async () => {
    if (connected && publicKey) {
      try {
        // Verify backend connectivity
        const status = await checkNetworkStatus();
        console.log('Network status:', status);
        
        // Test mint capability
        const testMetadata = {
          name: "Connection Test",
          symbol: "TEST",
          uri: "https://example.com/test.json",
          creators: [{ address: publicKey.toString(), share: 100 }]
        };
        await mintNFT(testMetadata);
      } catch (error) {
        console.error('Connection verification failed:', error);
      }
    }
  }, [connected, publicKey]);

  return (
    <WalletMultiButton 
      className="wallet-connect-btn"
      style={{ 
        gap: '8px',
        backgroundColor: '#4a148c',
        backgroundImage: 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%)'
      }}
      onClick={handleConnected}
    >
      {connected ? (
        <>
          <span className="balance-badge">
            {publicKey?.toString().slice(0,4)}...{publicKey?.toString().slice(-4)}
          </span>
        </>
      ) : (
        'Connect Wallet'
      )}
    </WalletMultiButton>
  );
}