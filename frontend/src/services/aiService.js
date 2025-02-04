import axios from 'axios';

export class AIService {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
    });
  }

  async sendQuery(query, contextNodes) {
    try {
      const response = await this.api.post('/ai/generate', {
        query,
        context: contextNodes
      });
      
      return {
        success: true,
        nodes: response.data.nodes || [],
        code: response.data.code || '',
        explanation: response.data.explanation || ''
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to process AI request'
      };
    }
  }

  async explainCode(codeSnippet) {
    try {
      const response = await this.api.post('/ai/explain', { code: codeSnippet });
      return response.data.explanation;
    } catch (error) {
      console.error('Code Explanation Error:', error);
      return 'Could not generate explanation for this code';
    }
  }
}

export const aiService = new AIService();
