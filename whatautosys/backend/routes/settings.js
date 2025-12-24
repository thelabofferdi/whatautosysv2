const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Get all settings
router.get('/', (req, res) => {
    const db = getDb();
    const settings = db.prepare('SELECT key, value FROM settings').all();

    // Convert to object
    const settingsObj = {};
    for (const s of settings) {
        settingsObj[s.key] = s.value;
    }

    res.json(settingsObj);
});

// Get single setting
router.get('/:key', (req, res) => {
    const db = getDb();
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);

    if (!setting) {
        return res.status(404).json({ error: 'Paramètre non trouvé' });
    }

    res.json({ key: req.params.key, value: setting.value });
});

// Update setting
router.put('/:key', (req, res) => {
    const db = getDb();
    const { key } = req.params;
    const { value } = req.body;

    db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run(key, value, value);

    res.json({ message: 'Paramètre mis à jour' });
});

// Update multiple settings
router.post('/bulk', (req, res) => {
    const db = getDb();
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Format invalide' });
    }

    const updateStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `);

    for (const [key, value] of Object.entries(settings)) {
        updateStmt.run(key, String(value), String(value));
    }

    res.json({ message: 'Paramètres mis à jour' });
});

// Get anti-ban settings
router.get('/anti-ban/config', (req, res) => {
    const db = getDb();
    const settings = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?').all('anti_ban_%');

    const config = {};
    for (const s of settings) {
        const shortKey = s.key.replace('anti_ban_', '');
        config[shortKey] = s.value;
    }

    res.json(config);
});

// Update anti-ban settings
router.put('/anti-ban/config', (req, res) => {
    const db = getDb();
    const { min_delay, max_delay, typing_enabled } = req.body;

    if (min_delay !== undefined) {
        db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?')
            .run(String(min_delay), 'anti_ban_min_delay');
    }

    if (max_delay !== undefined) {
        db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?')
            .run(String(max_delay), 'anti_ban_max_delay');
    }

    if (typing_enabled !== undefined) {
        db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?')
            .run(String(typing_enabled), 'anti_ban_typing_enabled');
    }

    res.json({ message: 'Configuration anti-ban mise à jour' });
});

// Get Telegram notification settings
router.get('/notifications/telegram', (req, res) => {
    const db = getDb();
    const botToken = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_bot_token');
    const chatId = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_chat_id');

    res.json({
        bot_token: botToken?.value || '',
        chat_id: chatId?.value || '',
        configured: Boolean(botToken?.value && chatId?.value)
    });
});

// Update Telegram settings
router.put('/notifications/telegram', (req, res) => {
    const db = getDb();
    const { bot_token, chat_id } = req.body;

    if (bot_token !== undefined) {
        db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?')
            .run(bot_token, 'telegram_bot_token');
    }

    if (chat_id !== undefined) {
        db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?')
            .run(chat_id, 'telegram_chat_id');
    }

    res.json({ message: 'Configuration Telegram mise à jour' });
});

// Test Telegram notification
router.post('/notifications/telegram/test', async (req, res) => {
    const db = getDb();
    const botToken = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_bot_token');
    const chatId = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_chat_id');

    if (!botToken?.value || !chatId?.value) {
        return res.status(400).json({ error: 'Telegram non configuré' });
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken.value}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId.value,
                text: '✅ Test de notification WhatAutosys réussi!',
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            return res.status(400).json({ error: error.description || 'Erreur Telegram' });
        }

        res.json({ message: 'Notification envoyée avec succès' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export all data (GDPR compliance)
router.get('/export', (req, res) => {
    const db = getDb();

    const data = {
        contacts: db.prepare('SELECT * FROM contacts').all(),
        messages: db.prepare('SELECT * FROM messages').all(),
        campaigns: db.prepare('SELECT * FROM campaigns').all(),
        products: db.prepare('SELECT * FROM products').all(),
        goals: db.prepare('SELECT * FROM conversation_goals').all(),
        settings: db.prepare('SELECT * FROM settings').all(),
        exported_at: new Date().toISOString()
    };

    res.setHeader('Content-Disposition', 'attachment; filename=whatautosys-export.json');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
});

// Get app statistics
router.get('/stats/overview', (req, res) => {
    const db = getDb();

    const contacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
    const messages = db.prepare('SELECT COUNT(*) as count FROM messages').get();
    const campaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE status = "completed"').get();
    const products = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get();
    const hotLeads = db.prepare('SELECT COUNT(*) as count FROM hot_leads WHERE handled = 0').get();

    const messagesToday = db.prepare(`
    SELECT COUNT(*) as count FROM messages 
    WHERE date(timestamp) = date('now') AND from_me = 1
  `).get();

    res.json({
        total_contacts: contacts.count,
        total_messages: messages.count,
        completed_campaigns: campaigns.count,
        active_products: products.count,
        pending_hot_leads: hotLeads.count,
        messages_today: messagesToday.count
    });
});

module.exports = router;
