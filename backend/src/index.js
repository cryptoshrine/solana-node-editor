// backend/src/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import solanaRoutes from './routes/solanaRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
import nftRoutes from './routes/nftRoutes.js';
import ValidatorManager from './services/ValidatorManager.js';
import { solanaClient } from './blockchain/solanaClient.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;
const validatorManager = new ValidatorManager();

// Configure CORS before other middleware
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Increase header limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add security headers but configure for local development
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:3001'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    }
  }
}));

// Add CORS headers for preflight requests
app.options('*', cors());

// Mount routes
app.use('/api/solana', solanaRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/simulate', simulationRoutes);
app.use('/api/nft', nftRoutes);

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
    app.listen(PORT, () => {
      console.log(`Backend API running on port ${PORT}`);
      console.log(`Connected to Solana ${process.env.SOLANA_NETWORK} via ${process.env.RPC_URL}`);
      console.log('Accepting requests from: http://localhost:3000');
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

export default app;
