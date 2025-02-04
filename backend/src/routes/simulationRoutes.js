import express from 'express';
import ValidatorManager from '../services/ValidatorManager.js';
import CodeGenerator from '../services/CodeGenerator.js';

const router = express.Router();
const validator = new ValidatorManager();
const codeGenerator = new CodeGenerator();

router.post('/start', async (req, res) => {
  try {
    await validator.start();
    const status = await validator.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/execute', async (req, res) => {
  try {
    const { nodes } = req.body;
    const code = codeGenerator.generate(nodes);
    // Execute code logic here
    res.json({ logs: ['Simulation executed'], code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const status = await validator.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
