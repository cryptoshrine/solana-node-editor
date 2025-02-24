import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Read the wallet file
const walletPath = path.resolve('./backend/test-wallet.json');
const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')));
const keypair = Keypair.fromSecretKey(secretKey);

console.log('Wallet Public Key:', keypair.publicKey.toBase58()); 