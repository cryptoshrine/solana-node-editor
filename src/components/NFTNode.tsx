import React, { useState, useCallback, useRef } from 'react';
import { Handle } from 'reactflow';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { MetaplexNftService } from '../services/metaplexNftService';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'react-toastify';

interface Creator {
  address: string;
  share: number;
}

interface NFTNodeData {
  uri: string;
  symbol: string;
  royalties: number;
  creators: Creator[];
  onMint?: (result: any) => void;
}

export const NFTNode: React.FC<{ data: NFTNodeData }> = ({ data }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [uri, setUri] = useState(data.uri || '');
  const [symbol, setSymbol] = useState(data.symbol || 'NFT');
  const [royalties, setRoyalties] = useState(data.royalties || 7);
  const [creators, setCreators] = useState<Creator[]>(data.creators || [
    { address: wallet.publicKey?.toBase58() || '', share: 60 },
    { address: '', share: 40 }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreatorChange = useCallback((index: number, field: keyof Creator, value: string | number) => {
    setCreators(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      const nftService = new MetaplexNftService(connection, wallet);
      
      // Upload the image
      const imageUri = await nftService.uploadAsset(file);
      
      // Upload metadata with image
      const metadataUri = await nftService.uploadMetadata({
        name: 'NFT',
        symbol,
        description: 'NFT created with Solana Node Editor',
        image: imageUri,
      });

      setUri(metadataUri);
      toast.success('Asset uploaded successfully');
    } catch (err) {
      console.error('Asset upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload asset');
      toast.error('Failed to upload asset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMint = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const nftService = new MetaplexNftService(connection, wallet);
      
      const result = await nftService.createNft({
        uri,
        name: 'NFT',
        symbol,
        royalties,
        creators: creators.map(creator => ({
          address: creator.address,
          share: creator.share
        }))
      });

      console.log('NFT created:', result);
      toast.success('NFT created successfully!');
      data.onMint?.(result);
      
    } catch (err) {
      console.error('NFT creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create NFT');
      toast.error('Failed to create NFT');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="nft-node" style={{ background: '#663399', padding: '15px', borderRadius: '8px', color: 'white' }}>
      <Handle type="target" position="top" style={{ background: '#fff' }} />
      
      <div style={{ marginBottom: '10px' }}>
        <label>Image Upload</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            padding: '5px',
            marginBottom: '5px',
            background: '#8a2be2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Upload Image
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>URI</label>
        <input
          type="text"
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          placeholder="https://arweave.net/..."
          style={{ width: '100%', padding: '5px' }}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Symbol</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{ width: '100%', padding: '5px' }}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Royalties (%)</label>
        <input
          type="number"
          value={royalties}
          onChange={(e) => setRoyalties(Number(e.target.value))}
          min="0"
          max="100"
          style={{ width: '100%', padding: '5px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Creators</label>
        {creators.map((creator, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
            <input
              type="text"
              value={creator.address}
              onChange={(e) => handleCreatorChange(index, 'address', e.target.value)}
              placeholder="Creator address"
              style={{ flex: 2, padding: '5px' }}
            />
            <input
              type="number"
              value={creator.share}
              onChange={(e) => handleCreatorChange(index, 'share', Number(e.target.value))}
              min="0"
              max="100"
              style={{ flex: 1, padding: '5px' }}
            />
          </div>
        ))}
      </div>

      {error && (
        <div style={{ color: '#ff4444', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={isLoading || !wallet.connected}
        style={{
          width: '100%',
          padding: '8px',
          background: isLoading ? '#555' : '#8a2be2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Creating...' : 'Mint NFT'}
      </button>

      <Handle type="source" position="bottom" id="a" style={{ background: '#fff' }} />
    </div>
  );
}; 