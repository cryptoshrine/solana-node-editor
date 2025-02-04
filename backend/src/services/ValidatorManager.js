import { execSync } from 'child_process';
import { Connection } from '@solana/web3.js';

export default class ValidatorManager {
  constructor() {
    this.connection = new Connection('http://localhost:8899', 'confirmed');
    this.validatorProcess = null;
  }

  start() {
    try {
      if (this.isRunning()) {
        console.log('Validator already running');
        return true;
      }

      this.validatorProcess = execSync(
        'solana-test-validator --reset --ledger test-ledger --quiet > validator.log 2>&1 &'
      );
      console.log('Local validator started');
      return true;
    } catch (error) {
      console.error('Validator startup failed:', error);
      return false;
    }
  }

  stop() {
    try {
      execSync('pkill -f solana-test-validator');
      console.log('Validator stopped');
      return true;
    } catch (error) {
      console.error('Error stopping validator:', error);
      return false;
    }
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
      blockHeight: await this.connection.getBlockHeight(),
      slot: await this.connection.getSlot()
    };
  }
}
