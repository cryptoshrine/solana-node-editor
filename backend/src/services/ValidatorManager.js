import { execSync } from 'child_process';
import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default class ValidatorManager {
  constructor() {
    this.connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    this.validatorProcess = null;
  }

  start() {
    // We're using devnet, so no need to start a local validator
    console.log('Using Solana devnet - no local validator needed');
    return true;
  }

  stop() {
    // No local validator to stop when using devnet
    console.log('Using Solana devnet - no local validator to stop');
    return true;
  }

  async isRunning() {
    try {
      await this.connection.getSlot();
      return true;
    } catch {
      return false;
    }
  }

  async getStatus() {
    return {
      isRunning: await this.isRunning(),
      network: process.env.SOLANA_NETWORK || 'devnet',
      rpcUrl: this.connection.rpcEndpoint
    };
  }
}
