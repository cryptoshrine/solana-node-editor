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
    
    // Debug prompt loading
    const promptPath = path.join(PROMPTS_PATH, 'nodeGeneration.md');
    console.log('Loading prompt from:', promptPath);
    
    try {
      this.prompts = {
        nodeGeneration: fs.readFileSync(promptPath, 'utf8'),
        errorResolution: fs.readFileSync(path.join(PROMPTS_PATH, 'errorResolution.md'), 'utf8')
      };
      console.log('Loaded node generation prompt:', this.prompts.nodeGeneration);
    } catch (error) {
      console.error('Error loading prompts:', error);
      throw error;
    }
  }

  // New helper method for node IDs
  generateNodeId(type) {
    const timestamp = Date.now();
    const random8 = Math.random().toString(36).substring(2, 10);
    return `${type}-${timestamp}-${random8}`;
  }

  async generateNodes(userInput, existingNodes = []) {
    try {
      // Add more structure to the prompt
      const fullPrompt = `${this.prompts.nodeGeneration}

CRITICAL: You must return a JSON object matching this exact structure:
{
  "nodes": [
    {
      "type": "nft",
      "data": {
        "uri": "string (metadata URI)",
        "royalties": "number (0-100)",
        "creators": [
          {
            "address": "string (public key)",
            "share": "number (0-100)"
          }
        ]
      }
    }
  ],
  "connections": []
}

Example NFT Request: "Create an NFT with metadata at https://example.com/metadata.json, 5% royalties, and one creator"
Example Response:
{
  "nodes": [
    {
      "type": "nft",
      "data": {
        "uri": "https://example.com/metadata.json",
        "royalties": 5,
        "creators": [
          {
            "address": "11111111111111111111111111111111",
            "share": 100
          }
        ]
      }
    }
  ],
  "connections": []
}

Current Request: ${userInput}
Current Nodes: ${JSON.stringify(existingNodes, null, 2)}`;

      console.log('Sending prompt to AI:', fullPrompt);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: fullPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      console.log('Raw AI response:', response.choices[0].message.content);

      // Remove Markdown code blocks and trim whitespace
      const rawContent = response.choices[0].message.content;
      const cleanedContent = rawContent
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      console.log('Cleaned AI response:', cleanedContent);

      let result;
      try {
        result = JSON.parse(cleanedContent);
        console.log('Parsed result:', result);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        console.error('Raw content that failed to parse:', rawContent);
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }

      if (!result || !Array.isArray(result.nodes)) {
        console.error('Invalid result structure:', result);
        throw new Error('AI response missing nodes array');
      }
        
      // Transform nodes to exact required format
      const validTypes = ['account', 'token', 'nft', 'dao', 'mint'];
      
      result.nodes = result.nodes.map((node, index) => {
        console.log(`Processing node ${index}:`, node);

        // Extract the base type without any prefixes
        const baseType = node.type?.toLowerCase()?.replace(/^create[-_]?/, '')?.replace(/[-_]/g, '') || '';
        console.log('Base type:', baseType);
          
        if (!validTypes.includes(baseType)) {
          console.error('Invalid node type:', { given: node.type, baseType, valid: validTypes });
          throw new Error(`Invalid node type: ${node.type}. Must be one of: ${validTypes.join(', ')}`);
        }

        // Get data from either data or parameters field
        const nodeData = node.data || node.parameters;
        if (!nodeData) {
          console.error('Missing data:', node);
          throw new Error(`Node is missing required data fields`);
        }

        console.log('Node data:', nodeData);

        // Create a new node with exact required structure based on type
        const nodeType = baseType;
        const baseNode = {
          id: this.generateNodeId(nodeType),
          type: nodeType
        };

        let processedNode;
        try {
          // Add type-specific data
          switch (nodeType) {
            case 'nft':
              if (!nodeData.uri) {
                throw new Error('NFT node missing required uri field');
              }
              processedNode = {
                ...baseNode,
                data: {
                  uri: nodeData.uri,
                  royalties: parseInt(nodeData.royalties) || 0,
                  creators: Array.isArray(nodeData.creators) ? nodeData.creators.map(creator => ({
                    address: creator.address || '',
                    share: parseInt(creator.share) || 0
                  })) : [],
                  label: `NFT: ${nodeData.uri.split('/').pop() || 'Untitled'}`
                }
              };
              break;
            case 'token':
              processedNode = {
                ...baseNode,
                data: {
                  name: nodeData.name || '',
                  symbol: nodeData.symbol || (nodeData.name || nodeType).toUpperCase().slice(0, 5),
                  decimals: parseInt(nodeData.decimals) || 0,
                  mintAuthority: nodeData.mintAuthority || '',
                  initialSupply: parseInt(nodeData.initialSupply) || undefined,
                  label: nodeData.name || `${nodeType} Node`
                }
              };
              break;
            default:
              processedNode = {
                ...baseNode,
                data: {
                  ...nodeData,
                  label: nodeData.name || `${nodeType} Node`
                }
              };
          }
          console.log('Processed node:', processedNode);
          return processedNode;
        } catch (nodeError) {
          console.error('Error processing node:', { nodeType, nodeData, error: nodeError });
          throw new Error(`Error processing ${nodeType} node: ${nodeError.message}`);
        }
      });

      // Ensure connections array exists
      result.connections = result.connections || [];
      
      console.log('Final result:', result);
      return result;
    } catch (error) {
      console.error('AI Service error:', error);
      console.error('Error stack:', error.stack);
      throw new Error(`AI Service Error: ${error.message}`);
    }
  }

  async generateNodesWithGPT35(userInput, existingNodes = []) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a Solana smart contract workflow generator. Always respond with valid JSON."
        },
        {
          role: "user",
          content: `Create a workflow for: ${userInput}\nCurrent nodes: ${JSON.stringify(existingNodes)}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    });

    return JSON.parse(response.choices[0].message.content.trim());
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
