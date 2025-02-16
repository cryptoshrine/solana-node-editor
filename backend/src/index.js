import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import solanaRoutes from './routes/solanaRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
import ValidatorManager from './services/ValidatorManager.js';
import { solanaClient } from './blockchain/solanaClient.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const validatorManager = new ValidatorManager();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/solana', solanaRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/simulate', simulationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start services
const startServer = async () => {
  try {
    await validatorManager.start();
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Backend API running on port ${PORT}`);
      console.log(`Connected to Solana ${process.env.SOLANA_NETWORK} via ${process.env.RPC_URL}`);
      console.log(`Accepting requests from: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await validatorManager.stop();
  process.exit();
});

// Start the server
startServer();