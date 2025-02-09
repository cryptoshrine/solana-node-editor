// frontend/src/components/WalletConnect.jsx
import useWallet from '../hooks/useWallet';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function WalletConnect() {
  const { publicKey, balance, connected } = useWallet();
  
  // Existing functionality remains intact
  const handleConnect = () => {
    console.log('Connection flow unchanged');
  };

  // Simply add balance display to existing button
  return (
    <WalletMultiButton onClick={handleConnect} style={{ gap: '8px' }}>
      {connected ? (
        <>
          <span className="balance-badge">{balance?.toFixed(2)} SOL</span>
          <span className="wallet-address">
            {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
          </span>
        </>
      ) : (
        'Connect Wallet'
      )}
    </WalletMultiButton>
  );
}