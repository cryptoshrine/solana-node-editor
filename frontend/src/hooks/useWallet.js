import { useCallback } from 'react';
import { useConnection, useWallet as useWalletAdapter } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';

export default function useWallet() {
  const { connection } = useConnection();
  const { publicKey, wallet, sendTransaction, connect, disconnect } = useWalletAdapter();

  // New: API call to backend for complex transactions
  const sendTransactionToBackend = useCallback(async (transactionType, params) => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    try {
      const response = await axios.post('/api/solana/mint-nft', {
        publicKey: publicKey.toString(),
        ...params
      });
      
      return response.data;
    } catch (error) {
      console.error('API Transaction error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Transaction failed');
    }
  }, [publicKey]);

  // Modified: Hybrid approach for simple transactions
  const sendTransactionWithRetry = useCallback(async (transaction, signers) => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    try {
      // Simple transactions can be done client-side
      const signature = await sendTransaction(transaction, connection, { signers });
      const confirmed = await connection.confirmTransaction(signature, 'confirmed');
      
      return {
        signature,
        ...confirmed.value
      };
    } catch (error) {
      console.error('Direct transaction failed:', error);
      throw error;
    }
  }, [connection, publicKey, sendTransaction]);

  // Keep existing utility functions
  const getBalance = useCallback(async () => {
    if (!publicKey) throw new Error('Wallet not connected');
    return connection.getBalance(publicKey);
  }, [connection, publicKey]);

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
    sendTransactionToBackend, // New method for API-backed transactions
    requestAirdrop,
    connected: !!publicKey,
    isConnected: !!publicKey,
    shortAddress: publicKey 
      ? `${publicKey.toBase58().slice(0,4)}...${publicKey.toBase58().slice(-4)}`
      : null
  };
}