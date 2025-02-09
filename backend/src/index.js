import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import solanaRoutes from './routes/solanaRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
import ValidatorManager from './services/ValidatorManager.js';
import { solanaClient } from './blockchain/solanaClient.js';

// Load environment variables FIRST
const currentFileUrl = import.meta.url;
const currentDir = dirname(fileURLToPath(currentFileUrl));
dotenv.config({ path: join(currentDir, '../../.env') });
console.log('Environment variables loaded:', {
  SOLANA_NETWORK: process.env.SOLANA_NETWORK,
  RPC_URL: process.env.RPC_URL?.slice(0, 20) + '...',
  PORT: process.env.PORT
});

// Express server setup
const app = express();
const validator = new ValidatorManager();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/solana', solanaRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/simulate', simulationRoutes);

// Health check
app.get('/health', (req, res) => res.json({ 
  status: 'ok',
  network: process.env.SOLANA_NETWORK,
  rpcNode: process.env.RPC_URL
}));

// Start services
const startServer = async () => {
  try {
    await validator.start();
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Backend API running on port ${PORT}`);
      console.log(`Connected to Solana ${process.env.SOLANA_NETWORK} via ${process.env.RPC_URL}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await validator.stop();
  process.exit();
});

// Start the server
startServer();