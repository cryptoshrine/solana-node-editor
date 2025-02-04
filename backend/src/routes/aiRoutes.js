import express from 'express';
import AIService from '../ai/AIService.js';

const router = express.Router();
const aiService = new AIService();

router.post('/generate', async (req, res) => {
  try {
    const { prompt, nodes } = req.body;
    const workflow = await aiService.generateNodes(prompt, nodes);
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/explain', async (req, res) => {
  try {
    const { code } = req.body;
    const explanation = await aiService.explainCode(code);
    res.json({ explanation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/resolve-error', async (req, res) => {
  try {
    const { error, nodes } = req.body;
    const solution = await aiService.resolveError(error, nodes);
    res.json(solution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
