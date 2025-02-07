import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(dirname(dirname(dirname(__filename))));
dotenv.config({ path: `${__dirname}/.env` });

class SolanaClient {
  constructor() {
    // Validate RPC URL format
    const rpcUrl = process.env.SOLANA_RPC_URL;
    if (!rpcUrl?.startsWith('http')) {
      throw new Error(`Invalid RPC URL: ${rpcUrl}. Must start with http:// or https://`);
    }

    // Initialize connection with local validator
    this.connection = new Connection(
      rpcUrl,
      process.env.COMMITMENT || 'confirmed'
    );

    // Load payer wallet
    this.payer = this.initializeWallet();
  }

  initializeWallet() {
    try {
      // Resolve wallet path (handle ~ expansion)
      const walletPath = path.resolve(
        process.env.LOCAL_WALLET_PATH.replace('~', process.env.HOME)
      );
      
      // Read and parse keypair file
      const keyFile = fs.readFileSync(walletPath, 'utf8');
      const keyArray = JSON.parse(keyFile);
      
      return Keypair.fromSecretKey(Uint8Array.from(keyArray));
    } catch (error) {
      throw new Error(`Wallet initialization failed: ${error.message}`);
    }
  }

  async checkBalance() {
    try {
      return await this.connection.getBalance(this.payer.publicKey);
    } catch (error) {
      throw new Error(`Balance check failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const [version, balance] = await Promise.all([
        this.connection.getVersion(),
        this.checkBalance()
      ]);

      return {
        network: process.env.SOLANA_NETWORK,
        version: version['solana-core'],
        balanceSOL: balance / LAMPORTS_PER_SOL,
        publicKey: this.payer.publicKey.toBase58(),
        rpcUrl: process.env.SOLANA_RPC_URL
      };
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }
}

// Export singleton instance
const solanaClient = new SolanaClient();
export default solanaClient;