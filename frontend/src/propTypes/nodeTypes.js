import PropTypes from 'prop-types';

export const accountNodeProps = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    balance: PropTypes.number,
    isTokenAccount: PropTypes.bool
  }).isRequired
};

export const tokenNodeProps = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    name: PropTypes.string,
    symbol: PropTypes.string,
    decimals: PropTypes.number,
    mintAuthority: PropTypes.string,
    initialSupply: PropTypes.number
  }).isRequired
};

export const nftNodeProps = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    uri: PropTypes.string,
    royalties: PropTypes.number,
    creators: PropTypes.arrayOf(
      PropTypes.shape({
        address: PropTypes.string,
        share: PropTypes.number
      })
    )
  }).isRequired
};

export const daoNodeProps = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    name: PropTypes.string,
    threshold: PropTypes.number,
    councilMint: PropTypes.string
  }).isRequired
};

export const mintNodeProps = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    mintAddress: PropTypes.string,
    destination: PropTypes.string,
    amount: PropTypes.number,
    authority: PropTypes.string
  }).isRequired
};
