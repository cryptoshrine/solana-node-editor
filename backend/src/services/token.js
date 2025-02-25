import { 
  createMint,
  getMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  getAccount
} from '@solana/spl-token';
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { solanaClient } from '../blockchain/solanaClient.js';
import { createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { findMetadataPda } from '@metaplex-foundation/js';

export class TokenService {
  constructor() {
    this.connection = solanaClient.connection;
    this.payer = solanaClient.payer;
  }

  async createTokenWithMetadata({
    name,
    symbol,
    decimals,
    initialSupply,
    uri = 'none'
  }) {
    console.log('Starting token creation process with params:', {
      name,
      symbol,
      decimals,
      initialSupply,
      uri
    });
    
    try {
      // Check wallet balance
      const balance = await this.connection.getBalance(this.payer.publicKey);
      console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
      
      // Ensure we have enough SOL for the creation process
      const minimumBalance = 0.05 * LAMPORTS_PER_SOL; // 0.05 SOL minimum
      if (balance < minimumBalance) {
        console.log(`Insufficient balance: ${balance / LAMPORTS_PER_SOL} SOL, minimum required: 0.05 SOL`);
        
        // Try to request an airdrop if on devnet
        if (solanaClient.NETWORK === 'devnet' || solanaClient.NETWORK === 'testnet') {
          try {
            console.log('Attempting to request an airdrop...');
            const signature = await this.connection.requestAirdrop(
              this.payer.publicKey,
              LAMPORTS_PER_SOL
            );
            await this.connection.confirmTransaction(signature, 'confirmed');
            console.log('Airdrop successful!');
          } catch (airdropError) {
            console.error('Airdrop failed:', airdropError);
            throw new Error('Insufficient funds and airdrop failed. Please fund the wallet manually.');
          }
        } else {
          throw new Error('Insufficient funds to create token. Please ensure the wallet has enough SOL.');
        }
      }

      // Create the token mint
      console.log('Creating token mint...');
      const mintKeypair = Keypair.generate();
      const mintAuthority = this.payer.publicKey;
      const freezeAuthority = this.payer.publicKey;

      // Create mint account
      const tokenMint = await createMint(
        this.connection,
        this.payer,
        mintAuthority,
        freezeAuthority,
        decimals,
        mintKeypair
      );
      console.log('Token mint created:', tokenMint.toBase58());

      // Create metadata
      console.log('Creating token metadata...');
      const metadataPDA = findMetadataPda(tokenMint);
      
      const tokenMetadata = {
        name,
        symbol,
        uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null
      };

      const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint: tokenMint,
          mintAuthority: this.payer.publicKey,
          payer: this.payer.publicKey,
          updateAuthority: this.payer.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: tokenMetadata,
            isMutable: true,
            collectionDetails: null
          }
        }
      );

      const metadataTransaction = new Transaction().add(createMetadataInstruction);
      const metadataTxSignature = await sendAndConfirmTransaction(
        this.connection,
        metadataTransaction,
        [this.payer]
      );
      console.log('Metadata created. Transaction signature:', metadataTxSignature);

      // Mint tokens if initialSupply is provided
      if (initialSupply) {
        console.log(`Minting ${initialSupply} tokens to wallet...`);
        const associatedTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          this.payer.publicKey
        );

        // Create token account if it doesn't exist
        try {
          await getAccount(this.connection, associatedTokenAccount);
        } catch (error) {
          // Account doesn't exist, create it
          console.log('Creating associated token account...');
          await createAssociatedTokenAccount(
            this.connection,
            this.payer,
            tokenMint,
            this.payer.publicKey
          );
        }

        // Mint tokens to the associated token account
        console.log('Minting tokens...');
        await mintTo(
          this.connection,
          this.payer,
          tokenMint,
          associatedTokenAccount,
          this.payer,
          initialSupply * (10 ** decimals)
        );
        console.log('Tokens minted successfully!');
      }

      return {
        tokenAddress: tokenMint.toBase58(),
        metadata: tokenMetadata,
        owner: this.payer.publicKey.toBase58(),
      };
    } catch (error) {
      console.error('Error in createTokenWithMetadata:', {
        error: error.message,
        stack: error.stack,
        params: { name, symbol, decimals, initialSupply, uri }
      });
      
      // Provide a more user-friendly error message
      if (error.message.includes('insufficient funds')) {
        throw new Error('Token creation failed: Insufficient SOL to pay for transaction. Please fund your wallet.');
      } else if (error.message.includes('rate limit')) {
        throw new Error('Token creation failed: RPC rate limit reached. Please try again later.');
      } else {
        throw new Error(`Token creation failed: ${error.message}`);
      }
    }
  }

  // Helper method to validate token parameters
  validateTokenParams(symbol, decimals, initialSupply) {
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
} 