// backend/src/blockchain/solanaClient.js
import fetch from 'node-fetch';
global.fetch = fetch;

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl
} from '@solana/web3.js';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { CustomDaoClient } from './customDaoClient.js';

// --- NEW METAPLEX IMPORTS ---
import {
  Metaplex,
  keypairIdentity,
  toBigNumber
} from '@metaplex-foundation/js';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment variables from multiple possible locations
const envPaths = [
  path.join(__dirname, '../../.env'),              // backend/.env
  path.join(__dirname, '../../../.env'),           // root/.env
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded environment variables from:', envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error('No .env file found in:', envPaths);
}

class SolanaClient {
  constructor() {
    // Get network configuration
    const network = process.env.SOLANA_NETWORK || 'devnet';
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(network);
    
    console.log('Initializing Solana Client with:', {
      network,
      rpcUrl,
      env: process.env.SOLANA_RPC_URL,
      envPaths
    });

    this.validateRpcUrl(rpcUrl);

    // Create a Solana connection
    this.connection = new Connection(
      rpcUrl,
      process.env.COMMITMENT || 'confirmed'
    );

    // Load the payer Keypair
    this.payer = this.initializePayerKeypair();

    // Explorer base URL (for providing links in responses)
    this.explorerUrl = process.env.EXPLORER_URL || 'https://explorer.solana.com';

    // Initialize the new Metaplex SDK
    this.metaplex = Metaplex.make(this.connection).use(keypairIdentity(this.payer));

    // DAO client (unchanged)
    this.daoClient = new CustomDaoClient(this.connection, {
      publicKey: this.payer.publicKey,
      signTransaction: async (tx) => {
        tx.partialSign(this.payer);
        return tx;
      },
      signAllTransactions: async (txs) => {
        txs.forEach((t) => t.partialSign(this.payer));
        return txs;
      }
    });

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
      // Use WALLET_PATH from env, with a fallback to test-wallet.json
      const keyfilePath = process.env.WALLET_PATH || './backend/test-wallet.json';
      console.log('Loading wallet from:', keyfilePath);
      
      const absolutePath = path.resolve(keyfilePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Wallet file not found at ${absolutePath}`);
      }

      const keyData = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
      return Keypair.fromSecretKey(Uint8Array.from(keyData));
    } catch (error) {
      console.error('Keypair initialization error:', error);
      throw new Error(`Failed to initialize payer keypair: ${error.message}`);
    }
  }

  /**
   * Returns basic network status: version, payer balance, current slot, etc.
   */
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

  /**
   * Creates a new SPL token **with** on-chain metadata using Metaplex's createSft().
   * This will handle:
   *  - Mint creation
   *  - Decimals
   *  - Initial supply (minted to the payer)
   *  - Token Metadata (so explorers show name/symbol)
   */
  async createToken(params) {
    const {
      name,
      symbol,
      decimals,
      mintAuthority,
      initialSupply,
      uri
    } = params;

    this.validateTokenParams({ symbol, decimals, initialSupply });

    try {
      console.log('Creating token with params:', {
        name,
        symbol,
        decimals,
        initialSupply,
        uri
      });

      // Test connection first
      try {
        const version = await this.connection.getVersion();
        console.log('Connected to Solana:', {
          version,
          endpoint: this.connection.rpcEndpoint
        });
      } catch (connError) {
        console.error('Connection test failed:', connError);
        throw new Error(`Failed to connect to Solana: ${connError.message}`);
      }

      // Create a "Semi-Fungible Token" (SFT) with the new Metaplex library
      console.log('Initializing token creation...');
      const { sft, response } = await this.metaplex.nfts().createSft({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        uri: uri || '',
        sellerFeeBasisPoints: 0,
        decimals: decimals,
        initialSupply: initialSupply
          ? toBigNumber(initialSupply * 10 ** decimals)
          : toBigNumber(0),
        isMutable: false
      }).run();

      console.log('Token created successfully:', {
        mint: sft.address.toBase58(),
        signature: response.signature
      });

      return {
        name: sft.name,
        symbol: sft.symbol,
        decimals: sft.decimals,
        mint: sft.address.toBase58(),
        txId: response.signature,
        explorerUrl: `${this.explorerUrl}/tx/${response.signature}`,
        initialSupply: initialSupply || 0,
        metadataAddress: sft.metadataAddress.toBase58()
      };
    } catch (error) {
      console.error('Token creation failed:', {
        error: error.message,
        stack: error.stack,
        params
      });
      throw new Error(`Token creation failed: ${error.message}`);
    }
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
      if (
        typeof initialSupply !== 'number' ||
        initialSupply <= 0 ||
        initialSupply > 1e9 ||
        !Number.isInteger(initialSupply)
      ) {
        errors.push('Supply must be integer 1-1,000,000,000');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid token parameters: ${errors.join(', ')}`);
    }
  }

  /**
   * Mint an NFT. (Optional, left as example.)
   * This uses the older "nfts().create()" approach but for a single edition NFT.
   */
  async mintNFT(metadata) {
    try {
      const { name, symbol, uri, royalties } = metadata;
      if (!name || !uri) {
        throw new Error('Invalid NFT metadata: name and uri are required');
      }

      const { nft, response } = await this.metaplex.nfts().create({
        name,
        symbol,
        uri,
        sellerFeeBasisPoints: royalties || 0
      });

      const signature = response.signature;
      return {
        mint: nft.address.toBase58(),
        signature,
        explorerUrl: `${this.explorerUrl}/tx/${signature}`,
        metadata: nft.metadataAddress.toBase58()
      };
    } catch (error) {
      console.error('NFT Mint Error:', {
        metadata,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`NFT mint failed: ${error.message}`);
    }
  }

  /**
   * Create a DAO using our custom client (unchanged from your original code).
   */
  async createDAO(params) {
    try {
      console.log('Creating DAO with params:', params);

      const {
        name,
        communityMint,
        votingThreshold,
        maxVotingTime = 432000, // 5 days
        holdUpTime = 86400 // 1 day
      } = params;

      if (!name || !communityMint) {
        throw new Error('Name and community mint are required');
      }

      // Use the custom DAO client you wrote
      const result = await this.daoClient.createDao({
        name,
        communityMint,
        votingThreshold: Math.floor(votingThreshold),
        maxVotingTime,
        holdUpTime
      });

      return {
        ...result,
        explorerUrl: `${this.explorerUrl}/tx/${result.txId}`
      };
    } catch (error) {
      console.error('DAO Creation Error:', {
        params,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`DAO creation failed: ${error.message}`);
    }
  }

  async createProposal(params) {
    try {
      console.log('Creating proposal with params:', params);

      const { daoAddress, description } = params;
      if (!daoAddress || !description) {
        throw new Error('DAO address and description are required');
      }

      const result = await this.daoClient.createProposal(daoAddress, {
        description
      });

      return {
        ...result,
        explorerUrl: `${this.explorerUrl}/tx/${result.txId}`
      };
    } catch (error) {
      console.error('Proposal Creation Error:', error);
      throw new Error(`Failed to create proposal: ${error.message}`);
    }
  }

  async castVote(params) {
    try {
      console.log('Casting vote with params:', params);

      const { daoAddress, proposalAddress, voteType } = params;
      if (!daoAddress || !proposalAddress || !voteType) {
        throw new Error('DAO address, proposal address, and vote type are required');
      }

      const result = await this.daoClient.castVote(daoAddress, proposalAddress, {
        voteType
      });

      return {
        ...result,
        explorerUrl: `${this.explorerUrl}/tx/${result.txId}`
      };
    } catch (error) {
      console.error('Vote Casting Error:', error);
      throw new Error(`Failed to cast vote: ${error.message}`);
    }
  }

  async executeProposal(params) {
    try {
      console.log('Executing proposal with params:', params);

      const { daoAddress, proposalAddress } = params;
      if (!daoAddress || !proposalAddress) {
        throw new Error('DAO address and proposal address are required');
      }

      const result = await this.daoClient.executeProposal(daoAddress, proposalAddress);

      return {
        ...result,
        explorerUrl: `${this.explorerUrl}/tx/${result.txId}`
      };
    } catch (error) {
      console.error('Proposal Execution Error:', error);
      throw new Error(`Failed to execute proposal: ${error.message}`);
    }
  }
}

const solanaClient = new SolanaClient();
export { SolanaClient, solanaClient };
