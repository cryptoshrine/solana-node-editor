import { Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

// Load wallet from environment variable
const loadWalletFromEnv = () => {
  try {
    if (!process.env.WALLET_PRIVATE_KEY) {
      throw new Error('WALLET_PRIVATE_KEY is not set in environment variables');
    }

    // Convert base64 private key to Uint8Array
    const privateKeyBytes = Buffer.from(process.env.WALLET_PRIVATE_KEY, 'base64');
    
    // Create keypair from private key bytes
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    console.error('Error loading wallet:', error);
    throw error;
  }
};

export const wallet = loadWalletFromEnv(); 