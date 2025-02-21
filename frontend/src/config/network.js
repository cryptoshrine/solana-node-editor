import { clusterApiUrl } from '@solana/web3.js';

const NETWORK = process.env.REACT_APP_SOLANA_NETWORK || 'devnet';
const CUSTOM_RPC = process.env.REACT_APP_RPC_ENDPOINT;

export const getNetworkConfig = () => {
  return {
    network: NETWORK,
    endpoint: CUSTOM_RPC || clusterApiUrl(NETWORK),
    isDevnet: NETWORK === 'devnet',
    programId: 'FpSSbLNqGCcEwdBdk34Gs8b722LTAvNGCET6xNr55oLC',
    tokenMetadataProgramId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  };
};

export default getNetworkConfig; 