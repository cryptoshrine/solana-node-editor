import axios from 'axios';

export class ValidatorService {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    });
  }

  async getValidatorStatus() {
    try {
      const response = await this.api.get('/validator/status');
      return {
        isRunning: true,
        blockHeight: response.data.blockHeight,
        slot: response.data.slot
      };
    } catch (error) {
      return {
        isRunning: false,
        error: error.response?.data?.error || 'Validator not responding'
      };
    }
  }
}

export const validatorService = new ValidatorService();
