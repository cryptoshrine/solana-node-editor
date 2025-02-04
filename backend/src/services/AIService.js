require('dotenv').config();
const { SolanaAIAssistant } = require('@solana/ai-kit');

class AIService {
  constructor() {
    this.ai = new SolanaAIAssistant({
      apiKey: process.env.AI_API_KEY,
      network: 'mainnet-beta'
    });
  }

  async generateNodes(prompt) {
    return this.ai.generateWorkflow(prompt);
  }
}

module.exports = AIService;
