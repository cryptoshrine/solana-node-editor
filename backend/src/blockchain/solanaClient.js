// backend/src/blockchain/solanaClient.js
import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { readFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bs58 from 'bs58';

// Load environment variables
dotenv.config();

// Default to devnet if not specified
const NETWORK = process.env.SOLANA_NETWORK || 'devnet';

// Use SOLANA_RPC_URL from env if available, otherwise use default devnet URL
// Try to use a more reliable RPC node URL if the default is having issues
const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl(NETWORK);

console.log('🔌 Initializing Solana client with RPC URL:', RPC_URL);
console.log('🌐 Network:', NETWORK);

// Create a connection to the Solana cluster
export const connection = new Connection(RPC_URL, 'confirmed');

// Try multiple sources for the keypair
let payer = null;

// Load wallet based on environment config
const initWallet = () => {
  try {
    // 1. Try to load from WALLET_PRIVATE_KEY (base58 encoded) if provided
    if (process.env.WALLET_PRIVATE_KEY) {
      console.log('📝 Loading wallet from WALLET_PRIVATE_KEY environment variable');
      try {
        const secretKey = bs58.decode(process.env.WALLET_PRIVATE_KEY);
        return Keypair.fromSecretKey(secretKey);
      } catch (error) {
        console.warn('⚠️ Failed to decode WALLET_PRIVATE_KEY, trying other methods...');
      }
    }

    // 2. Try to load from WALLET_PATH if provided
    if (process.env.WALLET_PATH) {
      console.log('📝 Loading wallet from path:', process.env.WALLET_PATH);
      const walletPath = path.resolve(process.env.WALLET_PATH);
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'));
      return Keypair.fromSecretKey(Uint8Array.from(walletData));
    }

    // 3. Fall back to test wallet
    console.log('📝 Loading test wallet');
    const testWalletPath = path.resolve('backend/test-wallet.json');
    const testWalletData = JSON.parse(readFileSync(testWalletPath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(testWalletData));
  } catch (error) {
    console.error('❌ Failed to load wallet:', error);
    throw new Error('Failed to initialize wallet: ' + error.message);
  }
};

// Initialize the payer
payer = initWallet();
console.log('🔑 Using wallet address:', payer.publicKey.toString());

// Check the wallet balance and log it
export const checkWalletBalance = async () => {
  try {
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`💰 Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('❌ Failed to check wallet balance:', error);
    throw error;
  }
};

// Helper to request airdrop if balance is low (only works on devnet/testnet)
export const requestAirdropIfNeeded = async (threshold = 0.05) => {
  if (NETWORK !== 'devnet' && NETWORK !== 'testnet') {
    console.log('⚠️ Airdrop only available on devnet/testnet');
    return false;
  }

  try {
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < threshold * LAMPORTS_PER_SOL) {
      console.log(`Balance below ${threshold} SOL, requesting airdrop...`);
      const signature = await connection.requestAirdrop(
        payer.publicKey,
        LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(signature, 'confirmed');
      const newBalance = await connection.getBalance(payer.publicKey);
      console.log(`New balance after airdrop: ${newBalance / LAMPORTS_PER_SOL} SOL`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Airdrop failed:', error);
    return false;
  }
};

// Export a Solana client object with the connection and payer
export const solanaClient = {
  connection,
  payer,
  checkWalletBalance,
  requestAirdropIfNeeded,
  NETWORK
};

// Automatically check balance on startup
checkWalletBalance().catch(console.error);
