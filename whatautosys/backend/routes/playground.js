const express = require('express');
const router = express.Router();
const {
    getClient,
    buildSystemPrompt,
    generateResponse
} = require('../mistral-ai');

// Playground Chat Endpoint
router.post('/chat', async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        // 1. Build the full system prompt to show as debug context
        const systemPrompt = buildSystemPrompt();

        // 2. Generate the response using the standard function (or custom call if we want more control)
        // We use the standard function to ensure fidelity to the real bot behavior
        const response = await generateResponse(message, '', conversationHistory);

        // 3. Return both the response and the context used
        res.json({
            success: true,
            response,
            debug: {
                systemPrompt,
                model: 'mistral-small-latest'
            }
        });

    } catch (error) {
        console.error('Playground error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
