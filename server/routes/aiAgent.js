const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { generateSQL, executeQuery } = require('../utils/aiAgent');

// POST /api/ai-agent - Natural language to SQL
router.post('/', auth, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // Generate SQL from natural language
    const sql = await generateSQL(prompt);

    // Execute the generated SQL
    const result = await executeQuery(sql);

    res.json({
      prompt,
      generatedQuery: sql,
      result
    });
  } catch (error) {
    console.error('AI Agent error:', error);
    res.status(400).json({
      error: error.message || 'Failed to process AI query',
      prompt: req.body.prompt
    });
  }
});

module.exports = router;
