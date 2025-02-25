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

    // Initialize creators array
    let nftCreators = [];
    
    // Check if any of the specified creators is the minting wallet
    const hasMintingWalletAsCreator = creators.some(
      creator => creator.address === mintingWalletAddress
    );
    
    // Special case: If one of the creators is the minting wallet address
    if (hasMintingWalletAsCreator) {
      console.log('Minting wallet detected in creators list, using as single entry');
      
      // If creators only include minting wallet, use a single entry with 100%
      if (creators.length === 1 && creators[0].address === mintingWalletAddress) {
        nftCreators = [{
          address: mintingWallet,
          share: 100,
          authority: mx.identity(),
          verified: true
        }];
      } else {
        // Filter out the minting wallet from the creators array to prevent duplicates
        const otherCreators = creators.filter(
          creator => creator.address !== mintingWalletAddress
        );
        
        // Get the share from the original minting wallet creator entry
        const mintingWalletCreator = creators.find(
          creator => creator.address === mintingWalletAddress
        );
        const mintingWalletShare = mintingWalletCreator ? mintingWalletCreator.share : 0;
        
        // Calculate total shares excluding minting wallet
        const otherCreatorsShareSum = otherCreators.reduce(
          (sum, creator) => sum + creator.share, 
          0
        );
        
        // Ensure total shares sum to 100%
        const totalShare = mintingWalletShare + otherCreatorsShareSum;
        
        if (totalShare !== 100) {
          // Adjust shares to sum to 100%
          const adjustmentFactor = 100 / totalShare;
          
          // Add minting wallet as verified creator
          nftCreators.push({
            address: mintingWallet,
            share: Math.round(mintingWalletShare * adjustmentFactor),
            authority: mx.identity(),
            verified: true
          });
          
          // Add other creators with adjusted shares
          for (const creator of otherCreators) {
            try {
              const creatorPubkey = new PublicKey(creator.address);
              const accountInfo = await mx.connection.getAccountInfo(creatorPubkey);
              
              if (accountInfo) {
                nftCreators.push({
                  address: creatorPubkey,
                  share: Math.round(creator.share * adjustmentFactor),
                  authority: mx.identity(),
                  verified: false
                });
                console.log(`Added creator ${creator.address} with adjusted share`);
              } else {
                console.warn(`Creator account ${creator.address} not found, skipping...`);
              }
            } catch (err) {
              console.warn(`Invalid creator address ${creator.address}, skipping:`, err.message);
            }
          }
        } else {
          // Total is already 100%, no need to adjust
          // Add minting wallet as verified creator
          nftCreators.push({
            address: mintingWallet,
            share: mintingWalletShare,
            authority: mx.identity(),
            verified: true
          });
          
          // Add other creators with their original shares
          for (const creator of otherCreators) {
            try {
              const creatorPubkey = new PublicKey(creator.address);
              const accountInfo = await mx.connection.getAccountInfo(creatorPubkey);
              
              if (accountInfo) {
                nftCreators.push({
                  address: creatorPubkey,
                  share: creator.share,
                  authority: mx.identity(),
                  verified: false
                });
                console.log(`Added creator ${creator.address} with share ${creator.share}`);
              } else {
                console.warn(`Creator account ${creator.address} not found, skipping...`);
              }
            } catch (err) {
              console.warn(`Invalid creator address ${creator.address}, skipping:`, err.message);
            }
          }
        }
      }
    } else {
      // No creators or none of them is the minting wallet
      if (!creators || creators.length === 0) {
        // No creators specified, use minting wallet with 100%
        nftCreators = [{
          address: mintingWallet,
          share: 100,
          authority: mx.identity(),
          verified: true
        }];
      } else {
        // Validate all creators and calculate total share
        let validCreators = [];
        let totalShare = 0;
        
        for (const creator of creators) {
          try {
            const creatorPubkey = new PublicKey(creator.address);
            const accountInfo = await mx.connection.getAccountInfo(creatorPubkey);
            
            if (accountInfo) {
              validCreators.push({
                address: creatorPubkey,
                share: creator.share
              });
              totalShare += creator.share;
              console.log(`Validated creator ${creator.address} with share ${creator.share}`);
            } else {
              console.warn(`Creator account ${creator.address} not found, skipping...`);
            }
          } catch (err) {
            console.warn(`Invalid creator address ${creator.address}, skipping:`, err.message);
          }
        }
        
        // If total share is not 100%, adjust to make it 100%
        if (totalShare !== 100 && validCreators.length > 0) {
          const adjustmentFactor = 100 / totalShare;
          for (let i = 0; i < validCreators.length; i++) {
            // For the last creator, ensure we hit exactly 100%
            if (i === validCreators.length - 1) {
              const currentTotal = nftCreators.reduce((sum, creator) => sum + creator.share, 0);
              validCreators[i].share = 100 - currentTotal;
            } else {
              validCreators[i].share = Math.round(validCreators[i].share * adjustmentFactor);
            }
          }
        }
        
        // Add validated creators to nftCreators
        for (const creator of validCreators) {
          nftCreators.push({
            address: creator.address,
            share: creator.share,
            authority: mx.identity(),
            verified: false
          });
          console.log(`Added creator ${creator.address.toBase58()} with share ${creator.share}`);
        }
      }
    }
    
    // Final check: ensure total is exactly 100%
    const finalTotal = nftCreators.reduce((sum, creator) => sum + creator.share, 0);
    if (finalTotal !== 100 && nftCreators.length > 0) {
      // Adjust the last creator to make the total exactly 100%
      const diff = 100 - finalTotal;
      nftCreators[nftCreators.length - 1].share += diff;
      console.log(`Adjusted last creator share by ${diff} to ensure total of 100%`);
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
