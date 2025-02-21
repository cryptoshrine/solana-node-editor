import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';

export class TokenService {
  constructor(connection) {
    this.connection = connection;
  }

  async createTokenWithMetadata({
    payer,
    name,
    symbol,
    decimals,
    initialSupply,
    uri = ''
  }) {
    try {
      console.log('Starting token creation process with params:', {
        name,
        symbol,
        decimals,
        initialSupply,
        uri: uri ? 'provided' : 'none'
      });

      // 1. Create the token mint
      console.log('Creating token mint...');
      const mintPubkey = await createMint(
        this.connection,
        payer,
        payer.publicKey,
        null, // No freeze authority
        decimals
      );
      console.log('Token mint created:', mintPubkey.toBase58());

      // 2. Create metadata (name and symbol are required, uri is optional)
      let metadataAddress = null;
      let metadataSignature = null;
      
      if (name && symbol) {  // Changed condition: only name and symbol required
        console.log('Creating token metadata...');
        const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
        
        const [metadataPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintPubkey.toBuffer(),
          ],
          TOKEN_METADATA_PROGRAM_ID
        );

        const metadataData = {
          name: `${name} (${symbol})`,  // Format: TOKEN NAME (SYMBOL)
          symbol,
          uri: uri || '',  // Use empty string if uri not provided
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null,
        };

        const createMetadataIx = createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataPDA,
            mint: mintPubkey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            updateAuthority: payer.publicKey,
          },
          {
            createMetadataAccountArgsV3: {
              data: metadataData,
              isMutable: true,
              collectionDetails: null,
            },
          }
        );

        const metadataTx = new Transaction().add(createMetadataIx);
        metadataSignature = await sendAndConfirmTransaction(
          this.connection,
          metadataTx,
          [payer]
        );

        metadataAddress = metadataPDA.toBase58();
        console.log('Metadata created successfully:', {
          address: metadataAddress,
          signature: metadataSignature,
          data: metadataData  // Log the actual metadata being set
        });
      } else {
        console.log('Skipping metadata creation (missing name or symbol)');
      }

      // 3. Create ATA and mint initial supply if specified
      let mintSignature = null;
      if (initialSupply > 0) {
        console.log('Creating Associated Token Account and minting initial supply...');
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
          this.connection,
          payer,
          mintPubkey,
          payer.publicKey
        );

        console.log('Token account created:', tokenAccount.address.toBase58());

        const rawAmount = initialSupply * (10 ** decimals);
        mintSignature = await mintTo(
          this.connection,
          payer,
          mintPubkey,
          tokenAccount.address,
          payer,
          rawAmount
        );

        console.log('Initial supply minted successfully:', {
          amount: initialSupply,
          rawAmount,
          signature: mintSignature
        });
      } else {
        console.log('Skipping initial supply (not specified or zero)');
      }

      const result = {
        mint: mintPubkey.toBase58(),
        metadataAddress,
        metadataSignature,
        mintSignature,
        success: true
      };

      console.log('Token creation completed successfully:', result);
      return result;

    } catch (error) {
      console.error('Error in createTokenWithMetadata:', {
        error: error.message,
        stack: error.stack,
        params: {
          name,
          symbol,
          decimals,
          initialSupply,
          uri: uri ? 'provided' : 'none'
        }
      });
      
      throw new Error(`Token creation failed: ${error.message}`);
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