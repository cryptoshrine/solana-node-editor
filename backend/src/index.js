import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv with explicit path
dotenv.config({ path: join(__dirname, '../.env') });

// Debug environment variables
console.log('Main process environment variables:', {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Present' : 'Missing',
  NODE_ENV: process.env.NODE_ENV,
  PWD: process.cwd()
});

import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/aiRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
import ValidatorManager from './services/ValidatorManager.js';

const app = express();
const validator = new ValidatorManager();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/simulate', simulationRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start validator with server
validator.start();

// Graceful shutdown
process.on('SIGINT', async () => {
  await validator.stop();
  process.exit();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
