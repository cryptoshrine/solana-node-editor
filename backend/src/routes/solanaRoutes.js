import { Router } from 'express';
import { solanaClient } from '../blockchain/solanaClient.js';

const router = Router();

// NFT Minting Endpoint
router.post('/mint-nft', async (req, res) => {
  try {
    const { name, symbol, uri, creators, royalties } = req.body;
    
    const result = await solanaClient.mintNFT({
      name,
      symbol,
      uri,
      creators,
      royalties
    });

    res.json({
      success: true,
      mintAddress: result.mint,
      signature: result.signature,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('NFT Mint Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details
    });
  }
});

// Network Status Endpoint
router.get('/network-status', async (req, res) => {
  try {
    const status = await solanaClient.testConnection();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;