import { 
  Connection, Keypair, LAMPORTS_PER_SOL, 
  SystemProgram, Transaction, PublicKey 
} from '@solana/web3.js';
import { 
  createInitializeMintInstruction, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID, 
  MINT_SIZE 
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import os from 'os';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

class SolanaClient {
  constructor() {
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8899';
    this.validateRpcUrl(rpcUrl);
    
    this.connection = new Connection(
      rpcUrl, 
      process.env.COMMITMENT || 'confirmed'
    );
    this.payer = this.initializePayerKeypair();
    this.explorerUrl = process.env.EXPLORER_URL || 'https://explorer.solana.com';
    
    console.log(`Solana Client Initialized:
      Network: ${process.env.SOLANA_NETWORK || 'localnet'}
      RPC: ${rpcUrl}
      Payer: ${this.payer.publicKey.toBase58()}
    `);
  }

  validateRpcUrl(url) {
    if (!url.startsWith('http')) {
      throw new Error(`Invalid RPC URL: ${url}. Must use HTTP(S) protocol`);
    }
  }

  initializePayerKeypair() {
    try {
      const keyfilePath = process.env.PAYER_KEYFILE.replace('~', os.homedir());
      const keyData = JSON.parse(fs.readFileSync(path.resolve(keyfilePath), 'utf8'));
      return Keypair.fromSecretKey(Uint8Array.from(keyData));
    } catch (error) {
      throw new Error(`Failed to initialize payer keypair: ${error.message}`);
    }
  }

  async getNetworkStatus() {
    try {
      const [version, balance, slot] = await Promise.all([
        this.connection.getVersion(),
        this.connection.getBalance(this.payer.publicKey),
        this.connection.getSlot()
      ]);

      return {
        network: process.env.SOLANA_NETWORK || 'custom',
        solanaCoreVersion: version['solana-core'],
        payerBalance: balance / LAMPORTS_PER_SOL,
        currentSlot: slot,
        rpcEndpoint: this.connection.rpcEndpoint,
        payerAddress: this.payer.publicKey.toBase58()
      };
    } catch (error) {
      throw new Error(`Network status check failed: ${error.message}`);
    }
  }

  async createToken(params) {
    const { name, symbol, decimals, mintAuthority, initialSupply } = params;
    this.validateTokenParams(params);

    const mintKeypair = Keypair.generate();
    const transaction = new Transaction();

    try {
      // Create and initialize mint
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: this.payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports: await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE),
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimals,
          new PublicKey(mintAuthority || this.payer.publicKey),
          null // Freeze authority
        )
      );

      // Handle initial supply
      if (initialSupply) {
        await this.addInitialSupply(
          transaction,
          mintKeypair.publicKey,
          decimals,
          initialSupply,
          mintAuthority
        );
      }

      // Sign and send transaction
      const signature = await this.sendTransaction(transaction, [mintKeypair]);

      return {
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        decimals,
        mint: mintKeypair.publicKey.toBase58(),
        txId: signature,
        explorerUrl: `${this.explorerUrl}/tx/${signature}`,
        ...(initialSupply && { initialSupply })
      };

    } catch (error) {
      console.error('Token Creation Error:', {
        params,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Token creation failed: ${error.message}`);
    }
  }

  async addInitialSupply(transaction, mint, decimals, supply, authority) {
    const authorityPubkey = new PublicKey(authority || this.payer.publicKey);
    const ata = await getAssociatedTokenAddress(mint, authorityPubkey);

    transaction.add(
      createAssociatedTokenAccountInstruction(
        this.payer.publicKey,
        ata,
        authorityPubkey,
        mint
      ),
      createMintToInstruction(
        mint,
        ata,
        authorityPubkey,
        BigInt(supply) * BigInt(10 ** decimals)
      )
    );
  }

  validateTokenParams({ symbol, decimals, initialSupply }) {
    const errors = [];
    
    if (!symbol || symbol.length < 2 || symbol.length > 5) {
      errors.push('Symbol must be 2-5 characters');
    }
    
    if (typeof decimals !== 'number' || decimals < 0 || decimals > 9) {
      errors.push('Decimals must be 0-9');
    }
    
    if (initialSupply) {
      if (typeof initialSupply !== 'number' || 
          initialSupply <= 0 ||
          initialSupply > 1e9 ||
          !Number.isInteger(initialSupply)) {
        errors.push('Supply must be integer 1-1,000,000,000');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid token parameters: ${errors.join(', ')}`);
    }
  }

  async mintNFT(metadata) {
    try {
      const { name, symbol, uri, creators, royalties } = metadata;
      this.validateNFTMetadata(metadata);

      const mintKeypair = Keypair.generate();
      const transaction = new Transaction();

      // Create NFT mint
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: this.payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports: await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE),
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          0, // NFT decimals
          this.payer.publicKey, // Mint authority
          this.payer.publicKey  // Freeze authority
        )
      );

      const signature = await this.sendTransaction(transaction, [mintKeypair]);
      const metadataAccount = await this.createTokenMetadata(
        mintKeypair.publicKey,
        metadata
      );

      return {
        mint: mintKeypair.publicKey.toBase58(),
        signature,
        explorerUrl: `${this.explorerUrl}/tx/${signature}`,
        metadata: metadataAccount
      };

    } catch (error) {
      console.error('NFT Mint Error:', {
        metadata,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`NFT mint failed: ${error.message}`);
    }
  }

  validateNFTMetadata({ name, symbol, uri, creators, royalties }) {
    const errors = [];
    
    if (!name || name.trim().length < 3) {
      errors.push('Name must be ≥3 characters');
    }
    
    if (!symbol || symbol.length > 10) {
      errors.push('Symbol must be ≤10 characters');
    }
    
    if (!uri || !uri.startsWith('https://')) {
      errors.push('Metadata URI must be HTTPS URL');
    }
    
    if (creators) {
      const totalShare = creators.reduce((sum, c) => sum + c.share, 0);
      if (totalShare !== 100) {
        errors.push('Creator shares must total 100%');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid NFT metadata: ${errors.join(', ')}`);
    }
  }

  async createTokenMetadata(mintAddress, { name, symbol, uri, creators, royalties }) {
    return {
      name: name.trim(),
      symbol: symbol.trim(),
      uri,
      creators: creators || [],
      royalties: royalties || 0,
      mint: mintAddress.toBase58(),
      metadataUri: uri,
      created: new Date().toISOString()
    };
  }

  async sendTransaction(transaction, signers = []) {
    try {
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = this.payer.publicKey;

      const uniqueSigners = this.deduplicateSigners([this.payer, ...signers]);
      uniqueSigners.forEach(s => transaction.partialSign(s));

      const rawTx = transaction.serialize();
      return await this.connection.sendRawTransaction(rawTx);
    } catch (error) {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  deduplicateSigners(signers) {
    return signers.filter((signer, index, self) =>
      index === self.findIndex(s => 
        s.publicKey.equals(signer.publicKey)
      )
    );
  }
}

const solanaClient = new SolanaClient();
export { SolanaClient, solanaClient };