// backend/src/routes/nftRoutes.js
import { Router } from 'express';
import {
  createMetaplexNft,
  updateMetaplexNft,
  verifyCollection
} from '../services/metaplexNftService.js';

const router = Router();

/**
 * POST /api/nft/create-nft
 * Create a new NFT on Solana devnet using Metaplex JS.
 */
router.post('/create-nft', async (req, res) => {
  try {
    const { name, symbol, uri, royalties, creators } = req.body;
    
    console.log('Received NFT creation request:', { 
      name, 
      symbol, 
      uri, 
      royalties, 
      creators 
    });
    
    // Validate required fields
    if (!name || !symbol || !uri) {
      console.error('Missing required fields:', { name, symbol, uri });
      return res
        .status(400)
        .json({ 
          success: false, 
          error: 'Name, symbol, and uri are required.' 
        });
    }

    // Validate symbol format (2-10 characters)
    if (!symbol || symbol.length < 2 || symbol.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Symbol must be 2-10 characters'
      });
    }

    // Validate royalties if provided
    if (royalties !== undefined && (typeof royalties !== 'number' || royalties < 0 || royalties > 100)) {
      return res.status(400).json({
        success: false,
        error: 'Royalties must be a number between 0 and 100'
      });
    }

    // Validate creators if provided
    if (creators && Array.isArray(creators)) {
      // Validate each creator
      for (const creator of creators) {
        if (!creator.address || typeof creator.share !== 'number' || creator.share < 0 || creator.share > 100) {
          return res.status(400).json({
            success: false,
            error: 'Each creator must have an address and share (0-100)'
          });
        }
      }

      // Validate total share is 100%
      const totalShare = creators.reduce((sum, creator) => sum + creator.share, 0);
      if (totalShare !== 100) {
        return res.status(400).json({
          success: false,
          error: 'Total creator share must equal 100'
        });
      }
    }

    // Create NFT using Metaplex service
    console.log('Creating NFT with Metaplex...');
    const mintPubkey = await createMetaplexNft({ 
      name, 
      symbol, 
      uri,
      royalties,
      creators 
    });
    
    console.log('NFT created successfully:', { mint: mintPubkey });
    res.json({ 
      success: true, 
      mint: mintPubkey 
    });
  } catch (err) {
    console.error('Metaplex NFT creation error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * POST /api/nft/update-nft
 * Update an existing NFT's onchain metadata (name, symbol, metadata URI).
 */
router.post('/update-nft', async (req, res) => {
  try {
    const { mintAddress, newName, newSymbol, newUri } = req.body;
    
    console.log('Received NFT update request:', {
      mintAddress,
      newName,
      newSymbol,
      newUri
    });

    if (!mintAddress || !newName || !newSymbol || !newUri) {
      return res.status(400).json({
        success: false,
        error: 'mintAddress, newName, newSymbol, and newUri are required.'
      });
    }

    // Update NFT using Metaplex service
    console.log('Updating NFT with Metaplex...');
    const updatedMint = await updateMetaplexNft({
      mintAddress,
      newName,
      newSymbol,
      newUri
    });
    
    console.log('NFT updated successfully:', { mint: updatedMint });
    res.json({ 
      success: true, 
      mint: updatedMint 
    });
  } catch (err) {
    console.error('Metaplex NFT update error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * POST /api/nft/verify-collection
 * Mark an NFT as verified within a collection onchain.
 */
router.post('/verify-collection', async (req, res) => {
  try {
    const { nftMintAddress, collectionMintAddress } = req.body;
    
    console.log('Received collection verification request:', {
      nftMintAddress,
      collectionMintAddress
    });

    if (!nftMintAddress || !collectionMintAddress) {
      return res.status(400).json({
        success: false,
        error: 'nftMintAddress and collectionMintAddress are required.'
      });
    }

    // Verify collection using Metaplex service
    console.log('Verifying collection with Metaplex...');
    const verifiedMint = await verifyCollection({
      nftMintAddress,
      collectionMintAddress
    });
    
    console.log('Collection verified successfully:', { mint: verifiedMint });
    res.json({ 
      success: true, 
      mint: verifiedMint 
    });
  } catch (err) {
    console.error('Metaplex NFT verify collection error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

export default router;
