const { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const { getDb } = require('./database');
const { analyzeMessage, detectHotLead } = require('./hot-leads');
const { processAIResponse } = require('./mistral-ai');

let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let io = null;
let messageQueue = [];
let isProcessingQueue = false;

// Anti-ban configuration (loaded from settings)
let antiBanConfig = {
    minDelay: 15000,
    maxDelay: 45000,
    typingEnabled: true
};

// ==================== WHATSAPP STATE ====================

function getWhatsAppState() {
    return {
        status: connectionStatus,
        qrCode: qrCodeData,
        isConnected: connectionStatus === 'connected'
    };
}

// ==================== INITIALIZATION ====================

async function initWhatsApp(socketIo) {
    io = socketIo;

    // Load anti-ban settings
    const db = getDb();
    const settings = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?').all('anti_ban_%');
    settings.forEach(s => {
        if (s.key === 'anti_ban_min_delay') antiBanConfig.minDelay = parseInt(s.value);
        if (s.key === 'anti_ban_max_delay') antiBanConfig.maxDelay = parseInt(s.value);
        if (s.key === 'anti_ban_typing_enabled') antiBanConfig.typingEnabled = s.value === 'true';
    });

    const authDir = path.join(__dirname, '../data/auth_info_baileys');

    // Ensure auth directory exists
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        browser: ['WhatAutosys', 'Chrome', '120.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    // Connection update handler
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Generate QR code as data URL
            qrCodeData = await qrcode.toDataURL(qr);
            connectionStatus = 'qr_ready';
            io?.emit('whatsapp:qr', qrCodeData);
            io?.emit('whatsapp:status', getWhatsAppState());
        }

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log('Connection closed. Status code:', statusCode, 'Reconnecting:', shouldReconnect);

            connectionStatus = 'disconnected';
            qrCodeData = null;
            io?.emit('whatsapp:status', getWhatsAppState());

            if (shouldReconnect) {
                setTimeout(() => initWhatsApp(io), 5000);
            } else {
                // Logged out - clear auth
                if (fs.existsSync(authDir)) {
                    fs.rmSync(authDir, { recursive: true, force: true });
                }
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp connected!');
            connectionStatus = 'connected';
            qrCodeData = null;
            io?.emit('whatsapp:status', getWhatsAppState());

            // Save auto-connect preference
            db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?')
                .run('true', 'whatsapp_auto_connect');
        }
    });

    // Credentials update
    sock.ev.on('creds.update', saveCreds);

    // Messages handler
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            await handleIncomingMessage(msg);
        }
    });

    // Contacts update
    sock.ev.on('contacts.update', (updates) => {
        const db = getDb();
        const insertContact = db.prepare(`
      INSERT OR REPLACE INTO contacts (jid, name, push_name, phone, last_message_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

        for (const contact of updates) {
            if (contact.id) {
                const phone = contact.id.split('@')[0];
                insertContact.run(
                    contact.id,
                    contact.name || contact.notify || phone,
                    contact.notify || null,
                    phone
                );
            }
        }
    });

    return sock;
}

// ==================== FEATURES ====================

// 1. Check if number exists on WhatsApp
async function checkNumber(phone) {
    if (!sock || connectionStatus !== 'connected') {
        throw new Error('WhatsApp non connecté');
    }

    try {
        const jid = formatJid(phone);
        const [result] = await sock.onWhatsApp(jid.replace('@s.whatsapp.net', ''));
        return {
            exists: !!result?.exists,
            jid: result?.jid || null
        };
    } catch (error) {
        console.error('Error checking number:', error);
        return { exists: false, error: error.message };
    }
}

// 2. Get Profile Picture
async function getProfilePic(jid) {
    if (!sock || connectionStatus !== 'connected') return null;

    try {
        const formattedJid = formatJid(jid);
        const ppUrl = await sock.profilePictureUrl(formattedJid, 'image');

        // Update DB
        const db = getDb();
        db.prepare('UPDATE contacts SET profile_pic = ? WHERE jid = ?').run(ppUrl, formattedJid);

        return ppUrl;
    } catch (error) {
        return null; // No profile pic or privacy restricted
    }
}

// 3. Simulate Typing
async function simulateTyping(jid, duration = 3000) {
    if (!sock || connectionStatus !== 'connected') return;

    const formattedJid = formatJid(jid);

    await sock.sendPresenceUpdate('composing', formattedJid);
    await delay(duration);
    await sock.sendPresenceUpdate('paused', formattedJid);
}

// Helper to format JID
function formatJid(contact) {
    if (contact.includes('@')) return contact;
    let formatted = contact.replace(/\D/g, ''); // Remove non-digits
    return `${formatted}@s.whatsapp.net`;
}

// ==================== MESSAGE HANDLING ====================

async function handleIncomingMessage(msg) {
    if (!msg.message) return;

    const jid = msg.key.remoteJid;
    const fromMe = msg.key.fromMe;
    const messageContent = extractMessageContent(msg);

    if (!messageContent) return;

    const db = getDb();

    // Upsert contact
    const phone = jid.split('@')[0];
    const pushName = msg.pushName || phone;

    db.prepare(`
    INSERT INTO contacts (jid, name, push_name, phone, last_message_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(jid) DO UPDATE SET 
      push_name = excluded.push_name,
      last_message_at = datetime('now')
  `).run(jid, pushName, pushName, phone);

    // Try to fetch profile pic in background
    getProfilePic(jid).catch(() => { });

    // Save message
    db.prepare(`
    INSERT OR IGNORE INTO messages (id, contact_jid, content, from_me, timestamp, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
        msg.key.id,
        jid,
        messageContent,
        fromMe ? 1 : 0,
        new Date(msg.messageTimestamp * 1000).toISOString(),
        fromMe ? 1 : 0
    );

    // Emit to frontend
    io?.emit('message:new', {
        id: msg.key.id,
        jid,
        content: messageContent,
        fromMe,
        timestamp: new Date(msg.messageTimestamp * 1000).toISOString(),
        pushName
    });

    // If incoming message (not from me), analyze for hot leads and auto-reply
    if (!fromMe) {
        // Analyze for hot lead signals
        const hotLeadResult = await detectHotLead(jid, messageContent);
        if (hotLeadResult.isHot) {
            io?.emit('hotlead:detected', hotLeadResult);
        }

        // Check if auto-reply is enabled
        const autoReply = db.prepare('SELECT value FROM settings WHERE key = ?').get('auto_reply_enabled');
        if (autoReply?.value === 'true') {
            // Get conversation history for context
            const history = db.prepare(`
        SELECT content, from_me FROM messages 
        WHERE contact_jid = ? 
        ORDER BY timestamp DESC 
        LIMIT 10
      `).all(jid).reverse();

            // Generate AI response
            const response = await processAIResponse(jid, messageContent, history);
            if (response) {
                // Determine typing duration based on length
                const typingDuration = Math.min(response.length * 50, 5000);
                await simulateTyping(jid, typingDuration);
                await sendMessage(jid, response, null, true);
            }
        }
    }
}

function extractMessageContent(msg) {
    const message = msg.message;

    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return `[Image] ${message.imageMessage.caption}`;
    if (message.videoMessage?.caption) return `[Video] ${message.videoMessage.caption}`;
    if (message.documentMessage?.caption) return `[Document] ${message.documentMessage.caption}`;
    if (message.locationMessage) return `[Location] ${message.locationMessage.name || ''}`;
    if (message.contactMessage) return `[Contact] ${message.contactMessage.displayName}`;
    if (message.audioMessage) return '[Voice Message]';
    if (message.stickerMessage) return '[Sticker]';

    return null;
}

// ==================== SENDING MESSAGES ====================

async function sendMessage(jid, content, options = {}, isAiGenerated = false) {
    if (!sock || connectionStatus !== 'connected') {
        throw new Error('WhatsApp non connecté');
    }

    const formattedJid = formatJid(jid);

    try {
        let messagePayload = {};

        // 1. Text Message
        if (typeof content === 'string' && !options.media && !options.location && !options.contact) {
            messagePayload = { text: content };
        }
        // 2. Location
        else if (options.location) {
            messagePayload = {
                location: {
                    degreesLatitude: options.location.lat,
                    degreesLongitude: options.location.lng,
                    name: options.location.name,
                    address: options.location.address
                }
            };
        }
        // 3. Contact
        else if (options.contact) {
            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${options.contact.name}\nTEL;type=CELL;type=VOICE;waid=${options.contact.phone}:${options.contact.phone}\nEND:VCARD`;
            messagePayload = {
                contacts: {
                    displayName: options.contact.name,
                    contacts: [{ vcard }]
                }
            };
        }
        // 4. Media (Image, Video, Document)
        else if (options.media) {
            const fs = require('fs');
            const mime = require('mime-types');
            const mediaPath = options.media;
            const mimeType = mime.lookup(mediaPath) || 'application/octet-stream';
            const buffer = fs.readFileSync(mediaPath);
            const fileName = path.basename(mediaPath);

            if (mimeType.startsWith('image/')) {
                messagePayload = { image: buffer, caption: content };
            } else if (mimeType.startsWith('video/')) {
                messagePayload = { video: buffer, caption: content };
            } else {
                messagePayload = { document: buffer, mimetype: mimeType, fileName, caption: content };
            }
        }
        // Fallback
        else {
            messagePayload = { text: content };
        }

        const result = await sock.sendMessage(formattedJid, messagePayload);

        // Save to database (Store text representation)
        const db = getDb();
        let dbContent = typeof content === 'string' ? content : '[Media/Location/Contact]';
        if (options.location) dbContent = `[Location] ${options.location.name}`;
        if (options.contact) dbContent = `[Contact] ${options.contact.name}`;

        db.prepare(`
      INSERT INTO messages (id, contact_jid, content, from_me, timestamp, ai_generated, status)
      VALUES (?, ?, ?, 1, datetime('now'), ?, 'sent')
    `).run(result.key.id, formattedJid, dbContent, isAiGenerated ? 1 : 0);

        // Update contact last message time
        db.prepare('UPDATE contacts SET last_message_at = datetime("now") WHERE jid = ?').run(formattedJid);

        // Emit to frontend
        io?.emit('message:sent', {
            id: result.key.id,
            jid: formattedJid,
            content: dbContent,
            fromMe: true,
            timestamp: new Date().toISOString()
        });

        return result;

    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

//Legacy support helper
async function sendMessageOld(jid, text, mediaPath = null, isAiGenerated = false) {
    return sendMessage(jid, text, { media: mediaPath }, isAiGenerated);
}

// ==================== ANTI-BAN QUEUE ====================

async function addToQueue(jid, message, mediaPath = null) {
    messageQueue.push({ jid, message, mediaPath });

    if (!isProcessingQueue) {
        processQueue();
    }
}

async function processQueue() {
    if (messageQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }

    isProcessingQueue = true;
    const item = messageQueue.shift();

    try {
        // Thinking time (1-2 seconds)
        const thinkingTime = Math.random() * 1000 + 1000;
        await delay(thinkingTime);

        // Simulate typing
        if (antiBanConfig.typingEnabled) {
            const typingDuration = Math.min((item.message || '').length * 50, 5000);
            await simulateTyping(item.jid, typingDuration);
        }

        // Send message
        await sendMessage(item.jid, item.message, { media: item.mediaPath });

        // Random delay before next message
        const pauseTime = Math.random() * (antiBanConfig.maxDelay - antiBanConfig.minDelay) + antiBanConfig.minDelay;
        await delay(pauseTime);

    } catch (error) {
        console.error('Queue processing error:', error);
        io?.emit('campaign:error', { jid: item.jid, error: error.message });
    }

    // Process next item
    processQueue();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getQueueStatus() {
    return {
        pending: messageQueue.length,
        isProcessing: isProcessingQueue
    };
}

function clearQueue() {
    messageQueue = [];
    isProcessingQueue = false;
}

// ==================== EXPORTS ====================

module.exports = {
    initWhatsApp,
    getWhatsAppState,
    sendMessage, // New unified sending
    addToQueue,
    getQueueStatus,
    clearQueue,
    // New features exported
    checkNumber,
    getProfilePic,
    simulateTyping
};
