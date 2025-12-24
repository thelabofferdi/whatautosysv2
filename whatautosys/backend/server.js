const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// Import modules
const { initDatabase, getDb } = require('./database');
const { initWhatsApp, getWhatsAppState } = require('./bridge');
const { initMistralAI } = require('./mistral-ai');
const catalogRoutes = require('./routes/catalog');
const campaignRoutes = require('./routes/campaigns');
const goalsRoutes = require('./routes/goals');
const settingsRoutes = require('./routes/settings');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../data/uploads');
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé'), false);
        }
    }
});

// Make io available to routes
app.set('io', io);
app.set('upload', upload);

// Initialize database
initDatabase();

// API Routes
app.use('/api/catalog', catalogRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai/playground', require('./routes/playground'));
app.use('/api/system', require('./routes/system'));

// === LICENSE API (v1 compatible routes) ===
// These routes mirror /api/system/* but under /license/* for v1 compatibility
const systemRoutes = require('./routes/system');
app.use('/license', systemRoutes);
app.use('/api/license', systemRoutes);

// Load license on startup
const { loadLicense } = require('./utils/license-manager');
loadLicense();

// Health check
app.get('/api/health', (req, res) => {
    const waState = getWhatsAppState();
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        whatsapp: waState.status,
        timestamp: new Date().toISOString()
    });
});

// WhatsApp routes
app.get('/api/whatsapp/status', (req, res) => {
    const state = getWhatsAppState();
    res.json(state);
});

app.post('/api/whatsapp/connect', async (req, res) => {
    try {
        await initWhatsApp(io);
        res.json({ success: true, message: 'Connection initiated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/whatsapp/contacts', (req, res) => {
    const db = getDb();
    const contacts = db.prepare('SELECT * FROM contacts ORDER BY last_message_at DESC').all();
    res.json(contacts);
});

app.get('/api/whatsapp/conversations', (req, res) => {
    const db = getDb();
    const conversations = db.prepare(`
    SELECT c.*, 
           (SELECT content FROM messages WHERE contact_jid = c.jid ORDER BY timestamp DESC LIMIT 1) as last_message,
           (SELECT COUNT(*) FROM messages WHERE contact_jid = c.jid AND is_read = 0 AND from_me = 0) as unread_count
    FROM contacts c 
    ORDER BY c.last_message_at DESC
  `).all();
    res.json(conversations);
});

app.get('/api/whatsapp/messages/:jid', (req, res) => {
    const db = getDb();
    const { jid } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = db.prepare(`
    SELECT * FROM messages 
    WHERE contact_jid = ? 
    ORDER BY timestamp DESC 
    LIMIT ? OFFSET ?
  `).all(jid, parseInt(limit), parseInt(offset));

    // Mark as read
    db.prepare('UPDATE messages SET is_read = 1 WHERE contact_jid = ? AND is_read = 0').run(jid);

    res.json(messages.reverse());
});

app.post('/api/whatsapp/send', async (req, res) => {
    const { jid, message, mediaPath } = req.body;

    try {
        const { sendMessage } = require('./bridge');
        const result = await sendMessage(jid, message, mediaPath);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// AI Routes
app.post('/api/ai/generate', async (req, res) => {
    try {
        const { generateResponse } = require('./mistral-ai');
        const { prompt, context, conversationHistory } = req.body;
        const response = await generateResponse(prompt, context, conversationHistory);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/ai/generate-campaign-messages', async (req, res) => {
    try {
        const { generateCampaignMessages } = require('./mistral-ai');
        const { template, contacts } = req.body;
        const messages = await generateCampaignMessages(template, contacts);
        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/ai/suggestions', async (req, res) => {
    try {
        const { generateSuggestions } = require('./mistral-ai');
        const { conversationHistory, contactInfo } = req.body;
        const suggestions = await generateSuggestions(conversationHistory, contactInfo);
        res.json({ success: true, suggestions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Brain/RAG Routes
app.post('/api/brain/upload', upload.single('file'), async (req, res) => {
    try {
        const { parseDocument } = require('./utils/file-parser');
        const content = await parseDocument(req.file.path);

        const db = getDb();
        db.prepare(`
      INSERT INTO brain_documents (filename, filepath, content, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(req.file.originalname, req.file.path, content);

        res.json({ success: true, filename: req.file.originalname });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/brain/documents', (req, res) => {
    const db = getDb();
    const docs = db.prepare('SELECT id, filename, created_at FROM brain_documents ORDER BY created_at DESC').all();
    res.json(docs);
});

app.delete('/api/brain/documents/:id', (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM brain_documents WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Hot Leads Routes
app.get('/api/hotleads', (req, res) => {
    const db = getDb();
    const leads = db.prepare(`
    SELECT * FROM hot_leads 
    ORDER BY score DESC, detected_at DESC
  `).all();
    res.json(leads);
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    res.json({
        success: true,
        path: `/uploads/${req.file.filename}`,
        filename: req.file.originalname
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send current WhatsApp status
    socket.emit('whatsapp:status', getWhatsAppState());

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 WhatAutosys Backend running on port ${PORT}`);

    // Auto-connect WhatsApp if previously connected
    const db = getDb();
    const settings = db.prepare('SELECT * FROM settings WHERE key = ?').get('whatsapp_auto_connect');
    if (settings?.value === 'true') {
        initWhatsApp(io).catch(console.error);
    }
});

module.exports = { app, io };
