import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import KnowledgeBase from './KnowledgeBase.js';
import dotenv from 'dotenv';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment variables from multiple possible locations
const envPaths = [
  path.resolve(__dirname, '../../.env'),              // backend/.env
  path.resolve(__dirname, '../../../.env'),           // root/.env
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded environment variables from:', envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error('No .env file found in:', envPaths);
}

// Debug environment variables
console.log('AI Service Environment:', {
  envPaths,
  hasOpenAIKey: process.env.OPENAI_API_KEY ? 'Present' : 'Missing',
  currentDir: process.cwd(),
});

export default class AIService {
  constructor() {
    // Try to get API key from different possible locations
    const apiKey = process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('Environment loading failed:', {
        envPaths,
        loadedEnvVars: Object.keys(process.env).filter(key => key.includes('OPENAI')),
        currentDir: process.cwd(),
      });
      throw new Error('OpenAI API key not found in environment variables');
    }
    
    // Validate API key format
    if (!this.isValidOpenAIKey(apiKey)) {
      throw new Error('Invalid OpenAI API key format');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      organization: process.env.OPENAI_ORG_ID
    });
    
    this.knowledgeBase = new KnowledgeBase();
    
    // Load prompts with proper error handling
    try {
      const promptsDir = path.join(__dirname, 'prompts');
      this.prompts = {
        nodeGeneration: fs.readFileSync(path.join(promptsDir, 'nodeGeneration.md'), 'utf8'),
        errorResolution: fs.readFileSync(path.join(promptsDir, 'errorResolution.md'), 'utf8')
      };
      console.log('Successfully loaded prompts');
    } catch (error) {
      console.error('Error loading prompts:', error);
      throw error;
    }
  }

  // Helper method to validate OpenAI API key format
  isValidOpenAIKey(key) {
    // Check if key matches expected format
    return typeof key === 'string' && 
           (key.startsWith('sk-') || key.startsWith('sk-proj-')) &&
           key.length > 20;
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
            case 'dao':
              if (!nodeData.name) {
                throw new Error('DAO node missing required name field');
              }
              if (!nodeData.communityMint) {
                throw new Error('DAO node missing required communityMint field');
              }
              if (!nodeData.votingThreshold || nodeData.votingThreshold < 1 || nodeData.votingThreshold > 100) {
                throw new Error('DAO node voting threshold must be between 1-100%');
              }
              processedNode = {
                ...baseNode,
                data: {
                  name: nodeData.name,
                  communityMint: nodeData.communityMint || '[TOKEN_MINT_ADDRESS]',
                  votingThreshold: nodeData.votingThreshold,
                  maxVotingTime: nodeData.maxVotingTime || 3 * 24 * 60 * 60, // 3 days
                  holdUpTime: nodeData.holdUpTime || 24 * 60 * 60, // 1 day
                  label: `DAO: ${nodeData.name}`,
                  status: 'pending' // Add initial status
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

  async generateNode(userInput) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: this.prompts.nodeGeneration },
          { role: 'user', content: userInput }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const nodeData = JSON.parse(response.choices[0].message.content);
      
      // Validate node type
      if (!['token', 'nft', 'dao', 'mint'].includes(nodeData.type)) {
        throw new Error(`Invalid node type: ${nodeData.type}`);
      }

      // Generate unique ID if not present
      if (!nodeData.id) {
        nodeData.id = `${nodeData.type}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      }

      // Validate required fields based on node type
      this.validateNodeData(nodeData);

      return nodeData;
    } catch (error) {
      console.error('Node generation error:', error);
      throw new Error(`Failed to generate node: ${error.message}`);
    }
  }

  validateNodeData(nodeData) {
    const { type, data } = nodeData;

    switch (type) {
      case 'token':
        if (!data.name) throw new Error('Token name is required');
        if (!data.decimals && data.decimals !== 0) throw new Error('Token decimals are required');
        break;

      case 'dao':
        if (!data.name) throw new Error('DAO name is required');
        if (!data.communityMint) throw new Error('Community mint is required');
        if (!data.votingThreshold || data.votingThreshold < 1 || data.votingThreshold > 100) {
          throw new Error('Voting threshold must be between 1-100%');
        }
        // Set default values for optional fields
        data.maxVotingTime = data.maxVotingTime || 3 * 24 * 60 * 60; // 3 days
        data.holdUpTime = data.holdUpTime || 24 * 60 * 60; // 1 day
        break;

      // Add other node type validations as needed
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
