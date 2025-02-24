// frontend/src/components/nft/NftCreator.jsx
import React, { useState } from 'react';
import { createNft } from '../../api/nft';

const NftCreator = () => {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [uri, setUri] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    try {
      setError(null);
      const res = await createNft({ name, symbol, uri });
      setResult(res);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Create NFT</h2>
      <div>
        <label>Name:</label>
        <input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label>Symbol:</label>
        <input value={symbol} onChange={e => setSymbol(e.target.value)} />
      </div>
      <div>
        <label>Metadata URI:</label>
        <input value={uri} onChange={e => setUri(e.target.value)} />
      </div>
      <button onClick={handleCreate}>Create NFT</button>
      {result && <div>NFT Created: {result.mint}</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
    </div>
  );
};

export default NftCreator;
