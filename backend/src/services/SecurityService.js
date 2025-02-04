import crypto from 'crypto';
import { Keypair } from '@solana/web3.js';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export default class SecurityService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    if (!this.encryptionKey || this.encryptionKey.length !== 32) {
      throw new Error('Invalid encryption key (needs 32 bytes)');
    }
  }

  encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(text) {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  handleKeys(keypair) {
    return {
      publicKey: keypair.publicKey.toString(),
      privateKey: this.encrypt(Buffer.from(keypair.secretKey).toString('hex'))
    };
  }

  generateKeypair() {
    return this.handleKeys(Keypair.generate());
  }
}
