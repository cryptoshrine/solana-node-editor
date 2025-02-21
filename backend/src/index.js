import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import solanaRoutes from './routes/solanaRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
import ValidatorManager from './services/ValidatorManager.js';
import { solanaClient } from './blockchain/solanaClient.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001; // Fixed port to avoid conflicts
const validatorManager = new ValidatorManager();

// Increase header limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure CORS with larger headers
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Access-Control-Allow-Origin'
  ],
  credentials: true,
  maxAge: 600,
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
}));

// Add header size configuration
app.use((req, res, next) => {
  // Increase header size limits
  req.maxHeadersCount = 100; // Increase max number of headers
  req.setTimeout(300000); // 5 minutes timeout
  next();
});

app.use(helmet());

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
    app.listen(PORT, () => {
      console.log(`Backend API running on port ${PORT}`);
      console.log(`Connected to Solana ${process.env.SOLANA_NETWORK} via ${process.env.RPC_URL}`);
      console.log(`Accepting requests from: ${process.env.CORS_ORIGINS || 'http://localhost:3000'}`);
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