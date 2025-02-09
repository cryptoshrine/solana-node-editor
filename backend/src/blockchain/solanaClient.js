import { 
  Connection, Keypair, LAMPORTS_PER_SOL, 
  SystemProgram, Transaction, sendAndConfirmTransaction 
} from '@solana/web3.js';
import { 
  createInitializeMintInstruction, 
  TOKEN_PROGRAM_ID, 
  MINT_SIZE 
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configure environment variables from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

class SolanaClient {
  constructor() {
    // Use environment variable with fallback
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8899';
    
    if (!rpcUrl.startsWith('http')) {
      throw new Error(`Invalid RPC URL: ${rpcUrl}. Must start with http:// or https://`);
    }

    this.connection = new Connection(
      rpcUrl,
      process.env.COMMITMENT || 'confirmed'
    );
    
    console.log(`Connected to Solana ${process.env.SOLANA_NETWORK} at ${rpcUrl}`);
    this.payer = this.initializeWallet();
  }

  initializeWallet() {
    try {
      const keyfilePath = process.env.PAYER_KEYFILE.replace(
        '~', 
        process.env.HOME || require('os').homedir()
      );
      const resolvedPath = path.resolve(keyfilePath);
      const keyFile = fs.readFileSync(resolvedPath, 'utf8');
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
        rpcUrl: this.connection.rpcEndpoint
      };
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  async mintNFT(metadata) {
    try {
      const mint = Keypair.generate();
      const lamports = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: this.payer.publicKey,
          newAccountPubkey: mint.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mint.publicKey,
          0, // Decimals (NFTs use 0)
          this.payer.publicKey, // Mint authority
          this.payer.publicKey  // Freeze authority
        )
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.payer, mint],
        { commitment: 'confirmed' }
      );

      return {
        mint: mint.publicKey.toBase58(),
        signature,
        metadata: await this.createTokenMetadata(mint.publicKey, metadata)
      };
    } catch (error) {
      console.error('NFT Mint Error:', {
        error: error.message,
        metadata,
        stack: error.stack
      });
      throw new Error(`NFT mint failed: ${error.message}`);
    }
  }

  async createTokenMetadata(mintAddress, { name, symbol, uri, creators, royalties }) {
    try {
      return {
        status: 'metadata_created',
        details: {
          name,
          symbol,
          uri,
          creators,
          royalties,
          mint: mintAddress.toBase58(),
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Metadata creation failed: ${error.message}`);
    }
  }
}

// Export singleton instance
const solanaClient = new SolanaClient();
export { SolanaClient, solanaClient };