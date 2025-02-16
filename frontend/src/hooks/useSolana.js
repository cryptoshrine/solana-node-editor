// frontend/src/hooks/useSolana.js
import { PublicKey } from '@solana/web3.js';

export const validateSolanaAddress = (address) => {
  if (!address) return false;
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

export const useSolana = () => {
  return {
    validateAddress: validateSolanaAddress
  };
};