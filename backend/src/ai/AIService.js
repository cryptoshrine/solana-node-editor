import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import KnowledgeBase from './KnowledgeBase.js';
import dotenv from 'dotenv';

// Ensure dotenv is configured
dotenv.config();

const PROMPTS_PATH = path.join(process.cwd(), 'src/ai/prompts');

// Debug environment variables
console.log('Environment variables:', {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Present' : 'Missing',
  NODE_ENV: process.env.NODE_ENV,
  PWD: process.cwd()
});

export default class AIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is missing');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      organization: process.env.OPENAI_ORG_ID
    });
    
    this.knowledgeBase = new KnowledgeBase();
    this.prompts = {
      nodeGeneration: fs.readFileSync(path.join(PROMPTS_PATH, 'nodeGeneration.md'), 'utf8'),
      errorResolution: fs.readFileSync(path.join(PROMPTS_PATH, 'errorResolution.md'), 'utf8')
    };
  }

  async generateNodes(userInput, existingNodes = []) {
    const prompt = `${this.prompts.nodeGeneration}
    
    User Request: ${userInput}
    Existing Nodes: ${JSON.stringify(existingNodes, null, 2)}
    
    Generate workflow:`;
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: this.knowledgeBase.getSystemContext()
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.2,
        max_tokens: 1000
      });

      return this.validateResponse(JSON.parse(response.choices[0].message.content));
    } catch (error) {
      throw new Error(`AI Service Error: ${error.message}`);
    }
  }

  async resolveError(errorLog, nodes) {
    const prompt = `${this.prompts.errorResolution}
    
    Error Context:
    ${errorLog}
    
    Current Nodes:
    ${JSON.stringify(nodes, null, 2)}
    
    Diagnosis:`;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: this.knowledgeBase.getErrorResolutionContext()
      }, {
        role: "user",
        content: prompt
      }],
      temperature: 0.1,
      max_tokens: 500
    });

    return JSON.parse(response.choices[0].message.content);
  }

  validateResponse(response) {
    // Implement schema validation
    return response;
  }
}
