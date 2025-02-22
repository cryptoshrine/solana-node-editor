import { 
  createNft,
  mplTokenMetadata,
  updateV1,
  verifyCollectionV1,
  findMetadataPda,
  fetchMetadataFromSeeds
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey as UMIPublicKey
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

export interface NFTCreationParams {
  uri: string;
  name: string;
  symbol: string;
  royalties: number;
  creators: {
    address: string;
    share: number;
  }[];
  collection?: string;
}

export class MetaplexNftService {
  private umi: any;

  constructor(connection: any, keypair: any) {
    this.initUmi(connection, keypair);
  }

  private initUmi(connection: any, keypair: any) {
    this.umi = createUmi(connection);
    const umiKeypair = this.umi.eddsa.createKeypairFromSecretKey(keypair.secretKey);
    
    this.umi
      .use(keypairIdentity(umiKeypair))
      .use(mplTokenMetadata())
      .use(irysUploader());
  }

  async uploadAsset(file: File) {
    try {
      const buffer = await file.arrayBuffer();
      const genericFile = createGenericFile(
        new Uint8Array(buffer),
        file.name,
        { contentType: file.type }
      );
      
      const [uri] = await this.umi.uploader.upload([genericFile]);
      return uri;
    } catch (error) {
      console.error('Asset Upload Error:', error);
      throw error;
    }
  }

  async uploadMetadata(params: {
    name: string;
    symbol: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  }) {
    try {
      const uri = await this.umi.uploader.uploadJson({
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image: params.image,
        attributes: params.attributes,
      });
      return uri;
    } catch (error) {
      console.error('Metadata Upload Error:', error);
      throw error;
    }
  }

  async createNft(params: NFTCreationParams) {
    try {
      const { uri, name, symbol, royalties, creators, collection } = params;
      
      // Generate mint keypair
      const mint = generateSigner(this.umi);
      
      // Convert royalties to basis points (e.g., 7% -> 700)
      const sellerFeeBasisPoints = percentAmount(royalties);
      
      // Format creators for Umi
      const formattedCreators = creators.map(creator => ({
        address: UMIPublicKey(creator.address),
        share: creator.share,
        verified: false
      }));

      // Create NFT
      const createNftParams = {
        mint,
        name,
        symbol,
        uri,
        sellerFeeBasisPoints,
        creators: formattedCreators,
        collection: collection ? {
          key: UMIPublicKey(collection),
          verified: false
        } : undefined,
        isMutable: true
      };

      await createNft(this.umi, createNftParams)
        .sendAndConfirm(this.umi, { send: { commitment: "finalized" } });

      // If collection is specified, verify it
      if (collection) {
        await this.verifyCollection(mint.publicKey, collection);
      }

      return {
        mint: mint.publicKey.toString(),
        success: true
      };
    } catch (error) {
      console.error('NFT Creation Error:', error);
      throw error;
    }
  }

  async verifyCollection(nftMint: string, collectionMint: string) {
    try {
      const metadata = findMetadataPda(this.umi, { mint: UMIPublicKey(nftMint) });
      
      await verifyCollectionV1(this.umi, {
        metadata,
        collectionMint: UMIPublicKey(collectionMint),
        authority: this.umi.identity,
      }).sendAndConfirm(this.umi);

      return true;
    } catch (error) {
      console.error('Collection Verification Error:', error);
      throw error;
    }
  }

  async updateNft(mint: string, params: Partial<NFTCreationParams>) {
    try {
      const { uri, name, symbol, royalties } = params;
      
      const nft = await fetchMetadataFromSeeds(this.umi, { 
        mint: UMIPublicKey(mint) 
      });

      await updateV1(this.umi, {
        mint: UMIPublicKey(mint),
        authority: this.umi.identity,
        data: {
          ...nft,
          name: name || nft.name,
          symbol: symbol || nft.symbol,
          uri: uri || nft.uri,
          sellerFeeBasisPoints: royalties ? percentAmount(royalties) : nft.sellerFeeBasisPoints,
        },
        isMutable: true,
      }).sendAndConfirm(this.umi);

      return {
        success: true,
        mint
      };
    } catch (error) {
      console.error('NFT Update Error:', error);
      throw error;
    }
  }
} 