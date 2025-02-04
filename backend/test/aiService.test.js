import AIService from '../src/ai/AIService.js';
import { jest } from '@jest/globals';

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                nodes: [{ type: 'account', data: { balance: 1 } }],
                connections: []
              })
            }
          }]
        })
      }
    }
  }))
}));

describe('AIService', () => {
  let aiService;

  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'test_key';
    aiService = new AIService();
  });

  test('generateNodes returns valid workflow', async () => {
    const result = await aiService.generateNodes('Create account with 1 SOL');
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('account');
  });

  test('handles AI service errors', async () => {
    aiService.openai.chat.completions.create.mockRejectedValue(new Error('API Error'));
    
    await expect(aiService.generateNodes('invalid request'))
      .rejects
      .toThrow('AI Service Error: API Error');
  });
});
