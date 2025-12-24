const { getDb } = require('./database');
const { v4: uuidv4 } = require('uuid');

// ==================== HOT LEAD SIGNALS ====================

const SIGNALS = {
    pricing_question: {
        weight: 25,
        patterns: [
            /prix|tarif|co[uû]t|combien|budget|devis/i,
            /c'est quoi (le |les )?prix/i,
            /vous faites (à |des )?combien/i
        ]
    },
    urgency: {
        weight: 30,
        patterns: [
            /urgent|rapidement|vite|asap|aujourd'hui|cette semaine|demain/i,
            /on doit (d[ée]cider|se lancer|commencer)/i,
            /besoin (rapide|urgent|vite)/i
        ]
    },
    demo_request: {
        weight: 30,
        patterns: [
            /d[ée]mo|essai|test|voir|montrer|pr[ée]sentation/i,
            /je (veux|voudrais|peux|pourrais) (voir|tester|essayer)/i,
            /comment [çc]a (marche|fonctionne)/i
        ]
    },
    competitor_mention: {
        weight: 15,
        patterns: [
            /actuellement|d[ée]j[àa]|en ce moment|on utilise/i,
            /salesforce|hubspot|pipedrive|zoho|monday/i,
            /autre (solution|outil|logiciel)/i
        ]
    },
    payment_question: {
        weight: 20,
        patterns: [
            /paiement|payer|r[èe]glement|facture|abonnement/i,
            /carte|virement|pr[ée]l[èe]vement/i,
            /mensuel|annuel|engagement/i
        ]
    },
    buying_intent: {
        weight: 25,
        patterns: [
            /int[ée]ress[ée]|je prends|on signe|ok pour|deal|march[ée] conclu/i,
            /quand (peut-on|on peut) commencer/i,
            /c'est bon|parfait|vendu/i
        ]
    },
    negative_intent: {
        weight: -50,
        patterns: [
            /pas int[ée]ress[ée]|non merci|stop|arr[êe]te/i,
            /plus tard|pas maintenant|pas le moment/i,
            /d[ée]sinscri|spam|signaler/i
        ]
    }
};

// ==================== LEAD SCORING ====================

function calculateLeadScore(detectedSignals) {
    let score = 0;

    for (const signal of detectedSignals) {
        score += signal.weight;
    }

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, score));
}

function analyzeMessage(message) {
    const detectedSignals = [];

    for (const [signalType, config] of Object.entries(SIGNALS)) {
        for (const pattern of config.patterns) {
            if (pattern.test(message)) {
                // Extract the matching phrase
                const match = message.match(pattern);
                detectedSignals.push({
                    type: signalType,
                    weight: config.weight,
                    phrase: match ? match[0] : null,
                    timestamp: new Date().toISOString()
                });
                break; // Only count each signal type once per message
            }
        }
    }

    return detectedSignals;
}

// ==================== HOT LEAD DETECTION ====================

async function detectHotLead(jid, message) {
    const db = getDb();

    // Analyze current message
    const newSignals = analyzeMessage(message);

    if (newSignals.length === 0) {
        return { isHot: false };
    }

    // Get existing signals for this contact (last 24 hours)
    const existingLead = db.prepare(`
    SELECT * FROM hot_leads 
    WHERE contact_jid = ? 
    AND detected_at > datetime('now', '-1 day')
    ORDER BY detected_at DESC
    LIMIT 1
  `).get(jid);

    let allSignals = newSignals;
    if (existingLead) {
        const previousSignals = JSON.parse(existingLead.signals || '[]');
        allSignals = [...previousSignals, ...newSignals];
    }

    const score = calculateLeadScore(allSignals);

    // Get threshold from settings
    const thresholdSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('hot_lead_threshold');
    const threshold = parseInt(thresholdSetting?.value || '70');

    const isHot = score >= threshold;

    if (isHot) {
        // Get contact info
        const contact = db.prepare('SELECT * FROM contacts WHERE jid = ?').get(jid);

        // Save or update hot lead
        const leadId = existingLead?.id || uuidv4();

        if (existingLead) {
            db.prepare(`
        UPDATE hot_leads 
        SET score = ?, signals = ?, detected_at = datetime('now')
        WHERE id = ?
      `).run(score, JSON.stringify(allSignals), existingLead.id);
        } else {
            db.prepare(`
        INSERT INTO hot_leads (id, contact_jid, score, signals)
        VALUES (?, ?, ?, ?)
      `).run(leadId, jid, score, JSON.stringify(allSignals));
        }

        // Update contact lead score
        db.prepare('UPDATE contacts SET lead_score = ? WHERE jid = ?').run(score, jid);

        // Send Telegram notification if configured and not already notified
        if (!existingLead?.notified) {
            await sendTelegramNotification(contact, score, allSignals, message);
            db.prepare('UPDATE hot_leads SET notified = 1 WHERE id = ?').run(leadId);
        }

        return {
            isHot: true,
            leadId,
            score,
            signals: allSignals,
            contact: {
                jid,
                name: contact?.name || contact?.push_name || jid.split('@')[0],
                phone: contact?.phone || jid.split('@')[0]
            },
            lastMessage: message,
            recommendation: getRecommendation(score)
        };
    }

    return { isHot: false, score, signals: newSignals };
}

function getRecommendation(score) {
    if (score >= 85) {
        return 'APPELER MAINTENANT - Intention d\'achat très élevée';
    } else if (score >= 70) {
        return 'Répondre rapidement - Prospect chaud';
    } else if (score >= 50) {
        return 'Prospect intéressé - Continuer la conversation';
    }
    return 'Prospect à qualifier';
}

// ==================== TELEGRAM NOTIFICATION ====================

async function sendTelegramNotification(contact, score, signals, lastMessage) {
    const db = getDb();

    const botTokenSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_bot_token');
    const chatIdSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_chat_id');

    const botToken = botTokenSetting?.value;
    const chatId = chatIdSetting?.value;

    if (!botToken || !chatId) {
        console.log('Telegram notification skipped: not configured');
        return;
    }

    const signalsList = signals
        .filter(s => s.weight > 0)
        .map(s => `• ${s.type.replace(/_/g, ' ')} ✅`)
        .join('\n');

    const message = `
🔥 *HOT LEAD DÉTECTÉ*

*Contact:* ${contact?.name || contact?.push_name || 'Inconnu'}
*Téléphone:* ${contact?.phone || 'N/A'}
*Score:* ${score}/100

*Signaux détectés:*
${signalsList}

*Dernier message:*
"${lastMessage.substring(0, 200)}${lastMessage.length > 200 ? '...' : ''}"

👉 ${getRecommendation(score)}
  `.trim();

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            console.error('Telegram notification failed:', await response.text());
        }
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
    }
}

// ==================== EXPORTS ====================

module.exports = {
    analyzeMessage,
    detectHotLead,
    calculateLeadScore,
    SIGNALS
};
