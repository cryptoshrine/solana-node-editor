import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export default function useSolana() {
  const { connection } = useConnection();
  const { publicKey, wallet, sendTransaction, connect, disconnect } = useWallet();

  const getBalance = useCallback(async () => {
    if (!publicKey) throw new Error('Wallet not connected');
    return connection.getBalance(publicKey);
  }, [connection, publicKey]);

  const sendTransactionWithRetry = useCallback(async (transaction, signers) => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    try {
      const signature = await sendTransaction(transaction, connection, { signers });
      const confirmed = await connection.confirmTransaction(signature, 'confirmed');
      return {
        signature,
        ...confirmed.value
      };
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }, [connection, publicKey, sendTransaction]);

  const requestAirdrop = useCallback(async (lamports = 1000000000) => {
    if (!publicKey) throw new Error('Wallet not connected');
    const signature = await connection.requestAirdrop(publicKey, lamports);
    return connection.confirmTransaction(signature);
  }, [connection, publicKey]);

  return {
    connection,
    publicKey,
    wallet,
    connect,
    disconnect,
    getBalance,
    sendTransaction: sendTransactionWithRetry,
    requestAirdrop,
    isConnected: !!publicKey,
    shortAddress: publicKey 
      ? `${publicKey.toBase58().slice(0,4)}...${publicKey.toBase58().slice(-4)}`
      : null
  };
}