const { Mistral } = require('@mistralai/mistralai');
const { getDb } = require('./database');

let mistralClient = null;
let apiKey = null;

// ==================== INITIALIZATION ====================

function initMistralAI(key) {
    apiKey = key;
    mistralClient = new Mistral({ apiKey: key });
    console.log('✅ Mistral AI initialized');
}

function getClient() {
    if (!mistralClient) {
        // Try to get API key from license (stored globally by Electron)
        if (global.licenseData?.apiKey) {
            initMistralAI(global.licenseData.apiKey);
        } else {
            throw new Error('Mistral AI non configuré. Vérifiez votre licence.');
        }
    }
    return mistralClient;
}

// ==================== CONTEXT BUILDING ====================

function buildCatalogContext() {
    const db = getDb();
    const products = db.prepare('SELECT * FROM products WHERE is_active = 1').all();

    if (products.length === 0) return '';

    let context = '\n\n📦 CATALOGUE PRODUITS:\n';

    for (const product of products) {
        context += `\n---\n`;
        context += `Produit: ${product.name}\n`;
        context += `Catégorie: ${product.category || 'Non définie'}\n`;
        context += `Description: ${product.description || 'Aucune description'}\n`;
        context += `Prix: ${product.base_price}${product.currency}/${product.price_unit}\n`;

        if (product.min_negotiable) {
            context += `Prix négociable minimum: ${product.min_negotiable}${product.currency}\n`;
            context += `Remise max: ${product.max_discount_percent}%\n`;
            if (product.negotiation_conditions) {
                context += `Conditions de négociation: ${product.negotiation_conditions}\n`;
            }
        }

        const features = JSON.parse(product.features || '[]');
        if (features.length > 0) {
            context += `Fonctionnalités: ${features.join(', ')}\n`;
        }

        const salesArgs = JSON.parse(product.sales_arguments || '[]');
        if (salesArgs.length > 0) {
            context += `Arguments de vente: ${salesArgs.join('; ')}\n`;
        }

        const objections = JSON.parse(product.objections_responses || '{}');
        if (Object.keys(objections).length > 0) {
            context += `Réponses aux objections:\n`;
            for (const [objection, response] of Object.entries(objections)) {
                context += `  - "${objection}": ${response}\n`;
            }
        }

        if (product.cta_primary) {
            context += `Call-to-action principal: ${product.cta_primary}\n`;
        }
    }

    return context;
}

function buildGoalsContext() {
    const db = getDb();
    const goals = db.prepare('SELECT * FROM conversation_goals WHERE is_active = 1 ORDER BY priority DESC').all();

    if (goals.length === 0) return '';

    let context = '\n\n🎯 OBJECTIFS CONVERSATIONNELS:\n';

    for (const goal of goals) {
        context += `\n---\n`;
        context += `Objectif: ${goal.name} (Priorité: ${goal.priority})\n`;
        context += `Description: ${goal.description || 'Non définie'}\n`;

        const tactics = JSON.parse(goal.tactics || '[]');
        if (tactics.length > 0) {
            context += `Tactiques:\n`;
            tactics.forEach((t, i) => context += `  ${i + 1}. ${t}\n`);
        }

        const successIndicators = JSON.parse(goal.success_indicators || '[]');
        if (successIndicators.length > 0) {
            context += `Indicateurs de succès: ${successIndicators.join('; ')}\n`;
        }

        const abortConditions = JSON.parse(goal.abort_conditions || '[]');
        if (abortConditions.length > 0) {
            context += `Conditions d'abandon: ${abortConditions.join('; ')}\n`;
        }
    }

    return context;
}

function buildBrainContext() {
    const db = getDb();
    const documents = db.prepare('SELECT content FROM brain_documents').all();

    if (documents.length === 0) return '';

    let context = '\n\n📚 DOCUMENTS DE RÉFÉRENCE:\n';

    for (const doc of documents) {
        // Limit each document to prevent token overflow
        const truncatedContent = doc.content?.substring(0, 5000) || '';
        context += `\n${truncatedContent}\n---\n`;
    }

    return context;
}

// ==================== SYSTEM PROMPT ====================

function buildSystemPrompt() {
    const basePrompt = `Tu es un agent commercial intelligent et naturel pour l'entreprise. Tu aides à gérer les conversations WhatsApp de manière professionnelle mais chaleureuse.

RÈGLES IMPORTANTES:
- NE JAMAIS dire que tu es un assistant automatique ou une IA
- Utiliser un ton naturel et humain (expressions comme "Ah super !", "Top !", emojis modérés)
- Rebondir sur les réponses du prospect
- Admettre quand tu ne sais pas ("Bonne question, laissez-moi vérifier...")
- Utiliser le storytelling et des exemples concrets
- Être concis (3-4 phrases max par message)
- Guider subtilement vers les objectifs commerciaux définis

${buildCatalogContext()}
${buildGoalsContext()}
${buildBrainContext()}
`;

    return basePrompt;
}

// ==================== RESPONSE GENERATION ====================

async function generateResponse(prompt, additionalContext = '', conversationHistory = []) {
    const client = getClient();

    const messages = [
        { role: 'system', content: buildSystemPrompt() + '\n' + additionalContext }
    ];

    // Add conversation history
    for (const msg of conversationHistory) {
        messages.push({
            role: msg.from_me ? 'assistant' : 'user',
            content: msg.content
        });
    }

    // Add current prompt
    messages.push({ role: 'user', content: prompt });

    try {
        const response = await client.chat.complete({
            model: 'mistral-small-latest',
            messages,
            temperature: 0.7,
            maxTokens: 500
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error('Mistral AI error:', error);

        // Provide clearer error messages
        if (error.message?.includes('fetch failed') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            throw new Error('Impossible de contacter l\'API Mistral. Vérifiez votre connexion internet.');
        } else if (error.status === 401) {
            throw new Error('Clé API Mistral invalide ou expirée. Veuillez mettre à jour votre licence.');
        } else if (error.status === 429) {
            throw new Error('Limite de requêtes atteinte. Réessayez dans quelques instants.');
        } else {
            throw new Error('Erreur IA: ' + (error.message || 'Erreur inconnue'));
        }
    }
}

async function processAIResponse(jid, incomingMessage, conversationHistory = []) {
    try {
        const db = getDb();

        // Get contact info for context
        const contact = db.prepare('SELECT * FROM contacts WHERE jid = ?').get(jid);
        const contactContext = contact ? `Contact: ${contact.name || contact.push_name || 'Inconnu'}` : '';

        const response = await generateResponse(incomingMessage, contactContext, conversationHistory);
        return response;

    } catch (error) {
        console.error('Error processing AI response:', error);
        return null;
    }
}

// ==================== CAMPAIGN MESSAGE GENERATION ====================

async function generateCampaignMessages(template, contacts) {
    const client = getClient();
    const messages = [];

    const systemPrompt = `Tu es un expert en rédaction commerciale. Tu génères des messages WhatsApp personnalisés et uniques pour chaque contact.

RÈGLES:
- Chaque message doit être UNIQUE et personnalisé
- Ton naturel et professionnel mais chaleureux
- Maximum 3-4 phrases
- Utiliser les données du contact pour personnaliser
- Ne pas être générique ou robotique

TEMPLATE DE L'UTILISATEUR:
${template}

CATALOGUE:
${buildCatalogContext()}
`;

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;

    for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);

        const batchPromises = batch.map(async (contact) => {
            const prompt = `Génère un message unique pour ce contact:
Nom: ${contact.name || 'Client'}
Entreprise: ${contact.company || 'Non spécifiée'}
Téléphone: ${contact.phone}
Données additionnelles: ${JSON.stringify(contact.customData || {})}

Message:`;

            try {
                const response = await client.chat.complete({
                    model: 'mistral-small-latest',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8,
                    maxTokens: 300
                });

                return {
                    contact,
                    message: response.choices[0].message.content.trim(),
                    success: true
                };

            } catch (error) {
                return {
                    contact,
                    message: null,
                    success: false,
                    error: error.message
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        messages.push(...batchResults);

        // Small delay between batches to avoid rate limits
        if (i + batchSize < contacts.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return messages;
}

// ==================== CO-PILOT SUGGESTIONS ====================

async function generateSuggestions(conversationHistory, contactInfo = {}) {
    const client = getClient();

    const systemPrompt = `Tu es un assistant commercial qui suggère des réponses.
Génère exactement 3 suggestions de réponse différentes.
Format de sortie: JSON array avec 3 objets {id: number, text: string}

CONTEXTE:
${buildCatalogContext()}
${buildGoalsContext()}

Contact: ${contactInfo.name || 'Client'}`;

    const historyText = conversationHistory.map(m =>
        `${m.from_me ? 'Moi' : 'Client'}: ${m.content}`
    ).join('\n');

    try {
        const response = await client.chat.complete({
            model: 'mistral-small-latest',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Historique:\n${historyText}\n\nGénère 3 suggestions de réponse:` }
            ],
            temperature: 0.7,
            maxTokens: 500
        });

        const content = response.choices[0].message.content;

        // Try to parse JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback: return as single suggestion
        return [{ id: 1, text: content }];

    } catch (error) {
        console.error('Error generating suggestions:', error);
        return [];
    }
}

// ==================== NEGOTIATION SUPPORT ====================

async function analyzeNegotiation(message, productId = null) {
    const db = getDb();

    let product = null;
    if (productId) {
        product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    } else {
        // Try to detect product from message
        const products = db.prepare('SELECT * FROM products WHERE is_active = 1').all();
        for (const p of products) {
            if (message.toLowerCase().includes(p.name.toLowerCase())) {
                product = p;
                break;
            }
        }
    }

    if (!product) return null;

    // Check if message contains price negotiation intent
    const pricePatterns = [
        /(\d+)\s*(€|euros?)/i,
        /prix|tarif|co[uû]t|cher|budget|réduction|remise|discount/i
    ];

    const isPriceRelated = pricePatterns.some(p => p.test(message));
    if (!isPriceRelated) return null;

    // Extract requested price if mentioned
    const priceMatch = message.match(/(\d+)\s*(€|euros?)/i);
    const requestedPrice = priceMatch ? parseInt(priceMatch[1]) : null;

    return {
        product,
        requestedPrice,
        basePrice: product.base_price,
        minPrice: product.min_negotiable || product.base_price,
        maxDiscount: product.max_discount_percent || 0,
        conditions: product.negotiation_conditions
    };
}

// ==================== EXPORTS ====================

module.exports = {
    initMistralAI,
    generateResponse,
    processAIResponse,
    generateCampaignMessages,
    generateSuggestions,
    analyzeNegotiation,
    buildSystemPrompt
};
