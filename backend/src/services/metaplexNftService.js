// backend/src/services/metaplexNftService.js

import { Connection, clusterApiUrl, Keypair, PublicKey } from '@solana/web3.js';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// We'll cache our Metaplex instance so it's only created once.
let metaplex = null;

/**
 * Initialize Metaplex if not already done.
 * Connects to devnet, loads your local keypair, and sets up identity.
 */
function initMetaplexIfNeeded() {
  if (metaplex) return metaplex;

  try {
    // 1. Connect to Solana using custom RPC if available
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
    console.log('Connecting to Solana RPC:', rpcUrl);
    const connection = new Connection(rpcUrl, 'confirmed');

    // 2. Load local keypair from JSON file
    const keypairPath = process.env.WALLET_PATH || './backend/test-wallet.json';
    const absoluteKeypairPath = path.resolve(keypairPath);
    
    if (!fs.existsSync(absoluteKeypairPath)) {
      throw new Error(`Wallet file not found at ${absoluteKeypairPath}. Please create it first.`);
    }

    console.log('Loading wallet from:', absoluteKeypairPath);
    const secretBytes = JSON.parse(fs.readFileSync(absoluteKeypairPath, 'utf8'));
    const signer = Keypair.fromSecretKey(new Uint8Array(secretBytes));
    
    // Log public key for debugging
    console.log('Using wallet address:', signer.publicKey.toBase58());

    // 3. Create a Metaplex instance and set the identity
    metaplex = new Metaplex(connection).use(keypairIdentity(signer));

    // 4. Verify connection and wallet balance
    connection.getBalance(signer.publicKey).then(balance => {
      console.log('Wallet balance:', balance / 1e9, 'SOL');
      if (balance < 0.1 * 1e9) {
        console.warn('Warning: Low wallet balance. Minting may fail.');
      }
    }).catch(err => {
      console.error('Failed to check wallet balance:', err);
    });

    return metaplex;
  } catch (error) {
    console.error('Failed to initialize Metaplex:', error);
    throw error;
  }
}

/**
 * Create a new NFT using Metaplex JS.
 * This assumes you already have a valid metadata URI hosted somewhere.
 * @param {object} params
 * @param {string} params.name - NFT name
 * @param {string} params.symbol - NFT symbol
 * @param {string} params.uri - Offchain JSON metadata URI
 * @param {number} [params.royalties=0] - Royalty percentage (0-100)
 * @param {Array<{address: string, share: number}>} [params.creators] - List of creators with shares
 * @returns {Promise<string>} - The minted NFT's address (base58)
 */
export async function createMetaplexNft({ name, symbol, uri, royalties = 0, creators = [] }) {
  try {
    console.log('Initializing Metaplex for NFT creation...');
    const mx = initMetaplexIfNeeded();

    console.log('Creating NFT with params:', { name, symbol, uri, royalties, creators });

    // Convert royalty percentage to basis points (100% = 10000)
    const sellerFeeBasisPoints = Math.floor(royalties * 100);

    // Get the minting wallet
    const mintingWallet = mx.identity().publicKey;
    const mintingWalletAddress = mintingWallet.toBase58();
    console.log('Minting wallet:', mintingWalletAddress);

    // Initialize creators array - ALWAYS include the minting wallet as a verified creator
    // This is the key change to ensure NFT creation never fails due to creator verification
    let nftCreators = [{
      address: mintingWallet,
      share: 100, // Default to 100%, will adjust if other valid creators exist
      authority: mx.identity(),
      verified: true
    }];
    
    // If no creators specified or invalid creators (like system program address), use minting wallet only
    if (!creators || creators.length === 0 || 
        (creators.length === 1 && creators[0].address === '11111111111111111111111111111111')) {
      console.log(`Using only minting wallet as creator with 100% share (royalties: ${royalties}%)`);
      // nftCreators is already set to minting wallet with 100%
    }
    // If creators are specified, try to add them but keep minting wallet as primary creator
    else {
      // Clear the default array since we'll rebuild it
      nftCreators = [];
      
      // Set minimum share for minting wallet (50% ensures it has significant control)
      const MIN_MINTING_WALLET_SHARE = 50;
      
      // First, collect all potentially valid creators (excluding minting wallet which we'll add separately)
      let additionalCreators = [];
      let totalValidShare = 0;
      
      for (const creator of creators) {
        // Skip if this is the minting wallet (we'll add it separately)
        if (creator.address === mintingWalletAddress) {
          continue;
        }
        
        try {
          const creatorPubkey = new PublicKey(creator.address);
          additionalCreators.push({
            address: creatorPubkey,
            share: creator.share
          });
          totalValidShare += creator.share;
          console.log(`Added potential creator ${creator.address} with share ${creator.share}`);
        } catch (err) {
          console.warn(`Invalid creator address format ${creator.address}, skipping:`, err.message);
          // Don't add invalid addresses
        }
      }
      
      // Calculate shares based on MIN_MINTING_WALLET_SHARE
      if (additionalCreators.length > 0) {
        // If additional creators would have too much share, scale them down
        if (totalValidShare > (100 - MIN_MINTING_WALLET_SHARE)) {
          const availableShare = 100 - MIN_MINTING_WALLET_SHARE;
          const scaleFactor = availableShare / totalValidShare;
          
          additionalCreators.forEach(creator => {
            creator.share = Math.floor(creator.share * scaleFactor);
          });
          
          console.log(`Scaled down additional creators to fit within ${availableShare}% share`);
        }
        
        // Calculate what's left for minting wallet after other creators
        const updatedTotalShare = additionalCreators.reduce((sum, creator) => sum + creator.share, 0);
        const mintingWalletShare = 100 - updatedTotalShare;
        
        // Add minting wallet as first creator (verified)
        nftCreators.push({
          address: mintingWallet,
          share: mintingWalletShare,
          authority: mx.identity(),
          verified: true
        });
        
        // Add additional creators as unverified
        additionalCreators.forEach(creator => {
          nftCreators.push({
            address: creator.address,
            share: creator.share,
            authority: mx.identity(),
            verified: false
          });
        });
      } else {
        // No valid additional creators, use only minting wallet
        nftCreators = [{
          address: mintingWallet,
          share: 100,
          authority: mx.identity(),
          verified: true
        }];
      }
    }
    
    // Final check: ensure total is exactly 100%
    const finalTotal = nftCreators.reduce((sum, creator) => sum + creator.share, 0);
    if (finalTotal !== 100 && nftCreators.length > 0) {
      // Adjust the minting wallet (first creator) to make the total exactly 100%
      const diff = 100 - finalTotal;
      nftCreators[0].share += diff;
      console.log(`Adjusted minting wallet share by ${diff} to ensure total of 100%`);
    }

    console.log('Final creators configuration:', nftCreators);

    // Create the NFT
    const { nft } = await mx.nfts().create({
      uri,
      name,
      symbol,
      sellerFeeBasisPoints,
      creators: nftCreators,
      tokenOwner: mx.identity().publicKey,
    });

    console.log('NFT created successfully:', nft.address.toBase58());
    return nft.address.toBase58();
  } catch (error) {
    console.error('Failed to create NFT:', error);
    if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds to create NFT. Please ensure the wallet has enough SOL.');
    }
    if (error.message.includes('not found')) {
      throw new Error('Failed to create NFT: Account not found. This might be due to RPC node issues or network congestion. Please try again.');
    }
    throw error;
  }
}

/**
 * Update an existing NFT's metadata (name, symbol, uri, etc.).
 * @param {object} params
 * @param {string} params.mintAddress - The mint address of the NFT
 * @param {string} params.newName - The updated name
 * @param {string} params.newSymbol - The updated symbol
 * @param {string} params.newUri - The updated metadata URI
 * @returns {Promise<string>} - The updated NFT's mint address
 */
export async function updateMetaplexNft({ mintAddress, newName, newSymbol, newUri }) {
  const mx = initMetaplexIfNeeded();

  const { nft } = await mx.nfts().update({
    nftOrSft: mintAddress,
    name: newName,
    symbol: newSymbol,
    uri: newUri,
  });

  return nft.address.toBase58();
}

/**
 * Verify that an NFT is part of a collection onchain.
 * (Might require additional arguments if the collection is sized or not.)
 * @param {object} params
 * @param {string} params.nftMintAddress - The NFT's mint address
 * @param {string} params.collectionMintAddress - The collection's mint address
 * @returns {Promise<string>} - The NFT's mint address once verified
 */
export async function verifyCollection({ nftMintAddress, collectionMintAddress }) {
  const mx = initMetaplexIfNeeded();

  const { nft } = await mx.nfts().verifyCollection({
    mintAddress: nftMintAddress,
    collectionMintAddress,
  });

  return nft.address.toBase58();
}
