// frontend/src/api/nft.js
import axios from 'axios';

/**
 * Adjust the default API base to match the backend's port (3001).
 * If you prefer a different approach (e.g., proxying through port 3000),
 * you can set REACT_APP_API_BASE in your .env.
 */
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Create an NFT by calling the backend endpoint.
 * @param {object} data - { name, symbol, uri, royalties, creators }
 * @returns {object} - { success: boolean, mint: string } on success
 */
export const createNft = async ({ name, symbol, uri, royalties, creators }) => {
  try {
    const response = await axios.post(`${API_URL}/api/nft/create-nft`, {
      name,
      symbol,
      uri,
      royalties,
      creators
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create NFT');
    }

    return response.data;
  } catch (error) {
    console.error('NFT creation error:', error);
    throw new Error(error.response?.data?.error || error.message);
  }
};

/**
 * Update an existing NFT's metadata by calling the backend endpoint.
 * @param {object} data - { mintAddress, newName, newSymbol, newUri }
 * @returns {object} - { success: boolean, mint: string } on success
 */
export const updateNft = async ({ mintAddress, newName, newSymbol, newUri }) => {
  try {
    const response = await axios.post(`${API_URL}/api/nft/update-nft`, {
      mintAddress,
      newName,
      newSymbol,
      newUri
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update NFT');
    }

    return response.data;
  } catch (error) {
    console.error('NFT update error:', error);
    throw new Error(error.response?.data?.error || error.message);
  }
};

/**
 * Verify that an NFT belongs to a given collection.
 * @param {object} data - { nftMintAddress, collectionMintAddress }
 * @returns {object} - { success: boolean, mint: string } on success
 */
export async function verifyCollection(data) {
  try {
    const response = await axios.post(`${API_URL}/api/nft/verify-collection`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}
