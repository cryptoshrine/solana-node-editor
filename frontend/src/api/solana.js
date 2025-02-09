import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/solana',
  timeout: 15000,
  headers: {
    'Content-Security-Policy': "connect-src 'self' http://localhost:3001"
  }
});

export const mintNFT = async (metadata) => {
  try {
    const response = await api.post('/mint-nft', metadata);
    return response.data;
  } catch (error) {
    console.error('Minting error:', error.response?.data || error.message);
    throw new Error('Failed to mint NFT');
  }
};

export const checkNetworkStatus = async () => {
  return api.get('/network-status');
};