// backend/src/routes/solanaRoutes.js
import { Router } from 'express';
import { solanaClient } from '../blockchain/solanaClient.js';

const router = Router();

// Enable CORS preflight for all routes
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Security-Policy');
  res.header('Access-Control-Expose-Headers', 'Content-Security-Policy');
  res.status(204).send();
});

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

// Token Creation Endpoint
router.post('/create-token', async (req, res) => {
  try {
    const { name, symbol, decimals, mintAuthority, initialSupply } = req.body;
    console.log('Received token creation request:', {
      name,
      symbol,
      decimals,
      mintAuthority,
      initialSupply
    });
    
    // Validate required fields
    if (!name || !symbol || typeof decimals === 'undefined') {
      console.error('Missing required fields:', { name, symbol, decimals });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, symbol, decimals'
      });
    }

    // Validate initial supply if provided
    if (typeof initialSupply !== 'undefined') {
      if (typeof initialSupply !== 'number' || 
          initialSupply <= 0 ||
          initialSupply > 1000000000 ||
          !Number.isInteger(initialSupply)) {
        console.error('Invalid initial supply:', initialSupply);
        return res.status(400).json({
          success: false,
          error: 'Invalid supply: Must be integer 1-1,000,000,000'
        });
      }
    }

    console.log('Creating token with solanaClient...');
    const result = await solanaClient.createToken({
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      decimals: Number(decimals),
      mintAuthority: mintAuthority?.trim(),
      initialSupply: initialSupply ? Number(initialSupply) : undefined
    });

    console.log('Token created successfully:', result);
    res.json({
      success: true,
      token: {
        name: result.name,
        symbol: result.symbol,
        decimals: result.decimals,
        mint: result.mint,
        txId: result.txId,
        explorerUrl: result.explorerUrl,
        ...(initialSupply && { initialSupply: result.initialSupply })
      }
    });
  } catch (error) {
    console.error('Token Creation Error:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        requiredFields: ['name', 'symbol', 'decimals'],
        symbolRules: '2-5 uppercase characters',
        decimalsRange: '0-9',
        ...(error.details?.supply && { supplyRules: '1-1,000,000,000' })
      }
    });
  }
});

// DAO Creation Endpoint
router.post('/create-dao', async (req, res) => {
  try {
    const { 
      name, 
      communityMint, 
      councilMint, 
      votingThreshold,
      maxVotingTime,
      holdUpTime,
      authority 
    } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      throw new Error('DAO name is required');
    }
    if (!communityMint) {
      throw new Error('Community token mint is required');
    }
    if (!votingThreshold || votingThreshold < 1 || votingThreshold > 100) {
      throw new Error('Voting threshold must be between 1-100%');
    }

    console.log('Creating DAO:', {
      name,
      communityMint,
      councilMint,
      votingThreshold,
      maxVotingTime,
      holdUpTime,
      authority
    });

    const result = await solanaClient.createDAO({
      name: name.trim(),
      communityMint,
      councilMint,
      votingThreshold: Number(votingThreshold),
      maxVotingTime: maxVotingTime ? Number(maxVotingTime) : 3 * 24 * 60 * 60,
      holdUpTime: holdUpTime ? Number(holdUpTime) : 24 * 60 * 60,
      authority
    });

    res.json({
      success: true,
      daoAddress: result.address,
      signature: result.signature,
      explorerUrl: result.explorerUrl
    });

  } catch (error) {
    console.error('DAO Creation Error:', error);
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
    const status = await solanaClient.getNetworkStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;