import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/solana',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false
});

export const mintNFT = async (metadata) => {
  try {
    console.log('Sending mint NFT request:', metadata);
    const response = await api.post('/mint-nft', metadata);
    console.log('Mint NFT API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Minting API error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      error: error.message
    });
    throw new Error('Failed to mint NFT');
  }
};

export const checkNetworkStatus = async () => {
  try {
    console.log('Sending network status request');
    const response = await api.get('/network-status');
    console.log('Network status API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Network status API error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      error: error.message
    });
    throw new Error('Failed to retrieve network status');
  }
};

export const createToken = async (tokenData) => {
  try {
    console.log('Sending token creation request:', tokenData);
    const response = await api.post('/create-token', tokenData);
    console.log('Token creation API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Token creation API error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      error: error.message
    });
    throw new Error(error.response?.data?.error || 'Failed to create token');
  }
};