// backend/src/routes/solanaRoutes.js

import { Router } from 'express';
import { solanaClient } from '../blockchain/solanaClient.js';
import { PublicKey, Keypair } from '@solana/web3.js';
import { TokenService } from '../services/token.js';
import { wallet } from '../services/wallet.js';
import * as mplTokenMetadata from '@metaplex-foundation/mpl-token-metadata';
import { CustomDaoClient } from '../blockchain/customDaoClient.js';
const { findMetadataPda } = mplTokenMetadata;

const router = Router();
const tokenService = new TokenService(solanaClient.connection);
const customDaoClient = new CustomDaoClient(solanaClient.connection, solanaClient.payer);

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
    const { name, symbol, decimals, initialSupply, uri } = req.body;
    console.log('Received token creation request:', {
      name,
      symbol,
      decimals,
      initialSupply,
      uri
    });
    
    // Validate required fields
    if (!name || !symbol || typeof decimals === 'undefined') {
      console.error('Missing required fields:', { name, symbol, decimals });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, symbol, decimals'
      });
    }

    // Validate symbol format
    if (!symbol || symbol.length < 2 || symbol.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Symbol must be 2-5 characters'
      });
    }

    // Validate decimals
    if (typeof decimals !== 'number' || decimals < 0 || decimals > 9) {
      return res.status(400).json({
        success: false,
        error: 'Decimals must be 0-9'
      });
    }

    // Validate initial supply if provided
    if (initialSupply !== undefined) {
      if (
        typeof initialSupply !== 'number' ||
        initialSupply <= 0 ||
        initialSupply > 1000000000 ||
        !Number.isInteger(initialSupply)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Initial supply must be integer 1-1,000,000,000'
        });
      }
    }

    // Create token with metadata
    const result = await tokenService.createTokenWithMetadata({
      payer: wallet,
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      decimals,
      initialSupply,
      uri: uri || ''
    });

    console.log('Token created successfully:', result);
    
    // The token service returns:
    // {
    //   tokenAddress: string,  // The mint address
    //   metadata: object,      // Metadata object without address field
    //   owner: string          // Wallet address
    // }
    
    // Since we don't have direct access to the metadata address, we'll send what we have
    res.json({
      success: true,
      token: {
        name,
        symbol: symbol.toUpperCase(),
        decimals,
        mint: result.tokenAddress, // Using tokenAddress as mint address
        // Note: We won't include metadataAddress since we can't reliably calculate it here
        initialSupply
      }
    });
  } catch (error) {
    console.error('Token Creation Error:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DAO Creation Endpoint
router.post('/create-dao', async (req, res) => {
  try {
    const {
      name,
      communityMint,
      votingThreshold,
      maxVotingTime,
      holdUpTime,
      authority
    } = req.body;

    console.log('Received DAO creation request:', {
      name,
      communityMint,
      votingThreshold,
      maxVotingTime,
      holdUpTime,
      authority
    });

    // Validate required fields
    const errors = [];

    if (!name?.trim()) {
      errors.push('DAO name is required');
    }

    if (!communityMint) {
      errors.push('Community token mint is required');
    } else {
      try {
        new PublicKey(communityMint);
      } catch (error) {
        errors.push('Invalid community mint address format');
      }
    }

    if (!votingThreshold) {
      errors.push('Voting threshold is required');
    } else if (
      typeof votingThreshold !== 'number' ||
      votingThreshold < 1 ||
      votingThreshold > 100
    ) {
      errors.push('Voting threshold must be between 1-100%');
    }

    if (authority) {
      try {
        new PublicKey(authority);
      } catch (error) {
        errors.push('Invalid authority address format');
      }
    }

    // Return all validation errors at once
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Create DAO
    console.log('Creating DAO with validated parameters...');
    const result = await customDaoClient.createDao({
      name: name.trim(),
      communityMint,
      votingThreshold: Number(votingThreshold),
      maxVotingTime: maxVotingTime ? Number(maxVotingTime) : undefined,
      holdUpTime: holdUpTime ? Number(holdUpTime) : undefined
    });

    console.log('DAO created successfully:', {
      name: result.name,
      address: result.address,
      txId: result.txId
    });

    // Return success response
    res.json({
      success: true,
      address: result.address,
      txId: result.txId,
      explorerUrl: `https://explorer.solana.com/address/${result.address}?cluster=${solanaClient.NETWORK}`,
      name: result.name
    });
  } catch (error) {
    console.error('DAO Creation Error:', {
      error: error.message,
      stack: error.stack
    });

    // Determine if it's a client error or server error
    const status = error.message.includes('Invalid') ? 400 : 500;

    res.status(status).json({
      success: false,
      error: error.message,
      details: error.details || undefined
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

// Create proposal
router.post('/create-proposal', async (req, res) => {
  try {
    const { daoAddress, description } = req.body;

    const result = await solanaClient.createProposal({
      daoAddress,
      description
    });

    res.json(result);
  } catch (error) {
    console.error('Create Proposal Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details
    });
  }
});

// Cast vote
router.post('/cast-vote', async (req, res) => {
  try {
    const { daoAddress, proposalAddress, voteType } = req.body;

    const result = await solanaClient.castVote({
      daoAddress,
      proposalAddress,
      voteType
    });

    res.json(result);
  } catch (error) {
    console.error('Cast Vote Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details
    });
  }
});

// Execute proposal
router.post('/execute-proposal', async (req, res) => {
  try {
    const { daoAddress, proposalAddress } = req.body;

    const result = await solanaClient.executeProposal({
      daoAddress,
      proposalAddress
    });

    res.json(result);
  } catch (error) {
    console.error('Execute Proposal Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details
    });
  }
});

// Get DAO info
router.get('/dao/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const result = await solanaClient.daoClient.program.account.dao.fetch(
      new PublicKey(address)
    );

    res.json({
      address,
      name: result.name,
      authority: result.authority.toString(),
      communityToken: result.communityToken.toString(),
      votingThreshold: result.config.votingThreshold.toNumber(),
      maxVotingTime: result.config.maxVotingTime.toString(),
      holdUpTime: result.config.holdUpTime.toString(),
      proposalCount: result.proposalCount.toString(),
      totalSupply: result.totalSupply.toString()
    });
  } catch (error) {
    console.error('Get DAO Info Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details
    });
  }
});

// Get proposal info
router.get('/proposal/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const result = await solanaClient.daoClient.program.account.proposal.fetch(
      new PublicKey(address)
    );

    res.json({
      address,
      creator: result.creator.toString(),
      description: result.description,
      forVotes: result.forVotes.toString(),
      againstVotes: result.againstVotes.toString(),
      startTime: result.startTime.toString(),
      endTime: result.endTime.toString(),
      status: result.status
    });
  } catch (error) {
    console.error('Get Proposal Info Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details
    });
  }
});

// Get all proposals for a DAO
router.get('/dao/:address/proposals', async (req, res) => {
  try {
    const { address } = req.params;

    const proposals = await solanaClient.daoClient.program.account.proposal.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: address
        }
      }
    ]);

    res.json(
      proposals.map((p) => ({
        address: p.publicKey.toString(),
        creator: p.account.creator.toString(),
        description: p.account.description,
        forVotes: p.account.forVotes.toString(),
        againstVotes: p.account.againstVotes.toString(),
        startTime: p.account.startTime.toString(),
        endTime: p.account.endTime.toString(),
        status: p.account.status
      }))
    );
  } catch (error) {
    console.error('Get Proposals Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details
    });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Solana Route Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default router;
