import ValidatorManager from '../src/services/ValidatorManager.js';
import { Connection } from '@solana/web3.js';
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getSlot: jest.fn().mockResolvedValue(12345),
    getBlockHeight: jest.fn().mockResolvedValue(100)
  }))
}));

describe('ValidatorManager', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidatorManager();
    execSync.mockClear();
  });

  test('starts validator successfully', async () => {
    const result = validator.start();
    expect(execSync).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('detects running validator', async () => {
    await validator.start();
    const status = await validator.isRunning();
    expect(status).toBe(true);
  });

  test('stops validator', () => {
    validator.start();
    const result = validator.stop();
    expect(execSync).toHaveBeenCalledWith('pkill -f solana-test-validator');
    expect(result).toBe(true);
  });
});
