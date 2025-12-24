const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { addToQueue, getQueueStatus, clearQueue } = require('../bridge');
const { generateCampaignMessages } = require('../mistral-ai');
const { parseContactsCSV } = require('../utils/file-parser');
const fs = require('fs');

// Get all campaigns
router.get('/', (req, res) => {
    const db = getDb();
    const campaigns = db.prepare(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM campaign_messages WHERE campaign_id = c.id AND status = 'sent') as actual_sent,
           (SELECT COUNT(*) FROM campaign_messages WHERE campaign_id = c.id AND status = 'failed') as actual_failed
    FROM campaigns c
    ORDER BY created_at DESC
  `).all();

    res.json(campaigns.map(c => ({
        ...c,
        settings: JSON.parse(c.settings || '{}')
    })));
});

// Get single campaign with messages
router.get('/:id', (req, res) => {
    const db = getDb();
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);

    if (!campaign) {
        return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    const messages = db.prepare(`
    SELECT * FROM campaign_messages WHERE campaign_id = ? ORDER BY status DESC
  `).all(req.params.id);

    res.json({
        ...campaign,
        settings: JSON.parse(campaign.settings || '{}'),
        messages
    });
});

// Create campaign
router.post('/', (req, res) => {
    const db = getDb();
    const id = uuidv4();

    const { name, type, template, ai_prompt, settings } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: 'Nom et type sont requis' });
    }

    db.prepare(`
    INSERT INTO campaigns (id, name, type, template, ai_prompt, settings)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, type, template || null, ai_prompt || null, JSON.stringify(settings || {}));

    res.status(201).json({ id, message: 'Campagne créée' });
});

// Import contacts for campaign
router.post('/:id/contacts', async (req, res) => {
    const upload = req.app.get('upload');

    upload.single('file')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            const db = getDb();
            const { id } = req.params;

            // Verify campaign exists
            const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
            if (!campaign) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(404).json({ error: 'Campagne non trouvée' });
            }

            let contacts = [];

            if (req.file) {
                // Parse CSV file
                contacts = await parseContactsCSV(req.file.path);
                fs.unlinkSync(req.file.path);
            } else if (req.body.contacts) {
                // Direct contacts array
                contacts = req.body.contacts;
            } else if (req.body.numbers) {
                // List of phone numbers
                const numbers = req.body.numbers.split(/[\n,;]/).filter(n => n.trim());
                contacts = numbers.map(phone => ({
                    phone: phone.trim(),
                    name: null,
                    customData: {}
                }));
            }

            if (contacts.length === 0) {
                return res.status(400).json({ error: 'Aucun contact valide trouvé' });
            }

            // Insert messages (will generate content later)
            const insertMsg = db.prepare(`
        INSERT INTO campaign_messages (id, campaign_id, contact_jid, phone, name, message, status)
        VALUES (?, ?, ?, ?, ?, '', 'pending')
      `);

            for (const contact of contacts) {
                const jid = `${contact.phone}@s.whatsapp.net`;
                insertMsg.run(uuidv4(), id, jid, contact.phone, contact.name);
            }

            // Update campaign contacts count
            db.prepare('UPDATE campaigns SET contacts_count = ? WHERE id = ?')
                .run(contacts.length, id);

            res.json({ count: contacts.length, message: 'Contacts importés' });

        } catch (error) {
            if (req.file) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: error.message });
        }
    });
});

// Generate AI messages for campaign
router.post('/:id/generate', async (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;

        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campagne non trouvée' });
        }

        if (campaign.type !== 'hyper_personalized') {
            return res.status(400).json({ error: 'Cette campagne n\'utilise pas la génération IA' });
        }

        // Get all contacts
        const campaignMessages = db.prepare(`
      SELECT * FROM campaign_messages WHERE campaign_id = ? AND status = 'pending'
    `).all(id);

        if (campaignMessages.length === 0) {
            return res.status(400).json({ error: 'Aucun contact en attente' });
        }

        // Get contacts info
        const contacts = campaignMessages.map(m => {
            const contact = db.prepare('SELECT * FROM contacts WHERE jid = ?').get(m.contact_jid);
            return {
                phone: m.phone,
                name: m.name || contact?.name || contact?.push_name,
                customData: contact ? JSON.parse(contact.custom_data || '{}') : {}
            };
        });

        // Generate messages using AI
        const generated = await generateCampaignMessages(campaign.ai_prompt, contacts);

        // Update messages in database
        const updateMsg = db.prepare('UPDATE campaign_messages SET message = ? WHERE campaign_id = ? AND phone = ?');

        let successCount = 0;
        for (const result of generated) {
            if (result.success && result.message) {
                updateMsg.run(result.message, id, result.contact.phone);
                successCount++;
            }
        }

        res.json({
            generated: successCount,
            total: contacts.length,
            message: `${successCount} messages générés`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate messages for broadcast mode (spintax)
router.post('/:id/generate-broadcast', (req, res) => {
    const db = getDb();
    const { id } = req.params;

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (!campaign.template) {
        return res.status(400).json({ error: 'Template de message requis' });
    }

    // Get all pending messages
    const campaignMessages = db.prepare(`
    SELECT * FROM campaign_messages WHERE campaign_id = ? AND status = 'pending'
  `).all(id);

    const updateMsg = db.prepare('UPDATE campaign_messages SET message = ? WHERE id = ?');

    for (const msg of campaignMessages) {
        // Apply spintax
        const message = applySpintax(campaign.template, msg.name);
        updateMsg.run(message, msg.id);
    }

    res.json({
        generated: campaignMessages.length,
        message: `${campaignMessages.length} messages générés`
    });
});

// Apply spintax variation
function applySpintax(template, recipientName = '') {
    // Replace {nom} with recipient name
    let result = template.replace(/\{nom\}/gi, recipientName || 'Client');

    // Apply spintax: {option1|option2|option3}
    result = result.replace(/\{([^{}]+)\}/g, (match, options) => {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });

    return result;
}

// Preview campaign messages
router.get('/:id/preview', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { count = 5 } = req.query;

    const messages = db.prepare(`
    SELECT * FROM campaign_messages 
    WHERE campaign_id = ? AND message != ''
    ORDER BY RANDOM()
    LIMIT ?
  `).all(id, parseInt(count));

    res.json(messages);
});

// Start campaign
router.post('/:id/start', async (req, res) => {
    const db = getDb();
    const io = req.app.get('io');
    const { id } = req.params;

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.status === 'running') {
        return res.status(400).json({ error: 'Campagne déjà en cours' });
    }

    // Get pending messages
    const messages = db.prepare(`
    SELECT * FROM campaign_messages WHERE campaign_id = ? AND status = 'pending' AND message != ''
  `).all(id);

    if (messages.length === 0) {
        return res.status(400).json({ error: 'Aucun message prêt à envoyer' });
    }

    // Update campaign status
    db.prepare(`
    UPDATE campaigns SET status = 'running', started_at = datetime('now') WHERE id = ?
  `).run(id);

    // Emit start event
    io?.emit('campaign:start', { campaignId: id, total: messages.length });

    // Add messages to queue
    let sentCount = 0;
    let failedCount = 0;

    for (const msg of messages) {
        try {
            await addToQueue(msg.contact_jid, msg.message);

            db.prepare('UPDATE campaign_messages SET status = ?, sent_at = datetime("now") WHERE id = ?')
                .run('sent', msg.id);

            sentCount++;

            io?.emit('campaign:progress', {
                campaignId: id,
                sent: sentCount,
                failed: failedCount,
                total: messages.length,
                currentContact: msg.name || msg.phone
            });

        } catch (error) {
            db.prepare('UPDATE campaign_messages SET status = ?, error = ? WHERE id = ?')
                .run('failed', error.message, msg.id);

            failedCount++;
        }
    }

    // Update campaign completion
    db.prepare(`
    UPDATE campaigns SET 
      status = 'completed', 
      sent_count = ?, 
      failed_count = ?, 
      completed_at = datetime('now')
    WHERE id = ?
  `).run(sentCount, failedCount, id);

    io?.emit('campaign:completed', {
        campaignId: id,
        sent: sentCount,
        failed: failedCount
    });

    res.json({
        status: 'started',
        total: messages.length
    });
});

// Pause/stop campaign
router.post('/:id/stop', (req, res) => {
    const db = getDb();
    const { id } = req.params;

    clearQueue();

    db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('paused', id);

    const io = req.app.get('io');
    io?.emit('campaign:stopped', { campaignId: id });

    res.json({ message: 'Campagne arrêtée' });
});

// Delete campaign
router.delete('/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;

    db.prepare('DELETE FROM campaign_messages WHERE campaign_id = ?').run(id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);

    res.json({ message: 'Campagne supprimée' });
});

// Get queue status
router.get('/queue/status', (req, res) => {
    res.json(getQueueStatus());
});

module.exports = router;
