import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read .env file directly
try {
  const envPath = join(__dirname, '.env');
  console.log('Checking .env file at:', envPath);
  console.log('File exists:', fs.existsSync(envPath));
  if (fs.existsSync(envPath)) {
    console.log('File contents:', fs.readFileSync(envPath, 'utf8'));
  }
} catch (err) {
  console.error('Error reading .env file:', err);
}

// Configure dotenv
dotenv.config();

console.log('Environment variables after dotenv.config():');
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
console.log('All env variables:', Object.keys(process.env));
