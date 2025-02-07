import { 
    Connection, Keypair, LAMPORTS_PER_SOL, 
    SystemProgram, Transaction, sendAndConfirmTransaction 
  } from '@solana/web3.js';
  import { 
    createMint, 
    createInitializeMintInstruction, 
    TOKEN_PROGRAM_ID, 
    MINT_SIZE 
  } from '@solana/spl-token';
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
  
      // Initialize connection
      this.connection = new Connection(
        rpcUrl,
        process.env.COMMITMENT || 'confirmed'
      );
  
      // Load payer wallet
      this.payer = this.initializeWallet();
    }
  
    initializeWallet() {
      try {
        const walletPath = path.resolve(
          process.env.LOCAL_WALLET_PATH.replace('~', process.env.HOME)
        );
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
        throw new Error(`NFT mint failed: ${error.message}`);
      }
    }
  
    async createTokenMetadata(mintAddress, { name, symbol, uri }) {
      try {
        return {
          status: 'metadata_created',
          details: {
            name,
            symbol,
            uri,
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
  export default solanaClient;