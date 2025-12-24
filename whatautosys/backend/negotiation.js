const { getDb } = require('./database');

// ==================== NEGOTIATION ENGINE ====================

/**
 * Analyze a price negotiation request and return appropriate action
 * @param {number} requestedPrice - The price requested by the client
 * @param {object} product - Product data from database
 * @param {object} options - Additional negotiation context
 */
function negotiate(requestedPrice, product, options = {}) {
    const basePrice = product.base_price;
    const minPrice = product.min_negotiable || basePrice;
    const maxDiscount = product.max_discount_percent || 0;

    // If no negotiation allowed
    if (!product.min_negotiable && maxDiscount === 0) {
        return {
            accepted: false,
            type: 'NO_NEGOTIATION',
            message: `Le prix de ${product.name} est fixe à ${basePrice}${product.currency}/${product.price_unit}.`
        };
    }

    // If requested price is at or above base price
    if (requestedPrice >= basePrice) {
        return {
            accepted: true,
            type: 'FULL_PRICE',
            finalPrice: basePrice,
            message: `Parfait ! Le ${product.name} est à ${basePrice}${product.currency}/${product.price_unit}.`
        };
    }

    // If requested price is within acceptable range
    if (requestedPrice >= minPrice) {
        return {
            accepted: true,
            type: 'NEGOTIATED',
            finalPrice: requestedPrice,
            discountPercent: Math.round((1 - requestedPrice / basePrice) * 100),
            message: `OK, je peux vous faire ${requestedPrice}${product.currency}/${product.price_unit} pour le ${product.name}. Deal ? 🤝`
        };
    }

    // If requested price is below minimum - generate counter-offers
    const counterOffers = generateCounterOffers(product, options);

    return {
        accepted: false,
        type: 'COUNTER_OFFER',
        requestedPrice,
        minPrice,
        counterOffers,
        message: buildCounterOfferMessage(requestedPrice, product, counterOffers)
    };
}

/**
 * Generate counter-offers based on product conditions
 */
function generateCounterOffers(product, options = {}) {
    const basePrice = product.base_price;
    const minPrice = product.min_negotiable || basePrice;
    const offers = [];

    // Parse negotiation conditions
    const conditions = parseNegotiationConditions(product.negotiation_conditions);

    // Standard offers based on commitment
    const standardOffers = [
        {
            condition: 'engagement_12_mois',
            label: 'Engagement 12 mois',
            discount: 20,
            available: true
        },
        {
            condition: 'paiement_annuel',
            label: 'Paiement annuel',
            discount: 15,
            available: true
        },
        {
            condition: 'parrainage',
            label: 'Parrainage',
            fixedDiscount: 50,
            available: true
        }
    ];

    // Merge with custom conditions
    for (const offer of standardOffers) {
        if (conditions[offer.condition] !== undefined) {
            offer.discount = conditions[offer.condition];
        }

        let finalPrice;
        if (offer.fixedDiscount) {
            finalPrice = basePrice - offer.fixedDiscount;
        } else {
            finalPrice = Math.round(basePrice * (1 - offer.discount / 100));
        }

        // Only add if final price is at or above minimum
        if (finalPrice >= minPrice) {
            offers.push({
                ...offer,
                price: finalPrice,
                currency: product.currency,
                unit: product.price_unit
            });
        }
    }

    // Sort by price (highest first - less aggressive discounts first)
    offers.sort((a, b) => b.price - a.price);

    return offers;
}

/**
 * Parse negotiation conditions string into structured format
 */
function parseNegotiationConditions(conditionsStr) {
    const conditions = {};

    if (!conditionsStr) return conditions;

    // Parse formats like "12 mois: -20%, annuel: -15%"
    const parts = conditionsStr.split(/[,;]/);

    for (const part of parts) {
        const match = part.match(/(\w+).*?(-?\d+)%?/i);
        if (match) {
            const condition = match[1].toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/mois?/i, 'mois')
                .replace(/an(nuel)?/i, 'annuel');

            conditions[condition] = parseInt(match[2]);
        }
    }

    return conditions;
}

/**
 * Build a natural language counter-offer message
 */
function buildCounterOfferMessage(requestedPrice, product, counterOffers) {
    const currency = product.currency || 'EUR';
    const minPrice = product.min_negotiable;

    let message = `${requestedPrice}${currency} c'est un peu serré pour moi... `;

    if (counterOffers.length === 0) {
        message += `Le mieux que je puisse faire c'est ${minPrice}${currency}/${product.price_unit}.`;
        return message;
    }

    message += `Par contre, j'ai quelques options :\n\n`;

    for (let i = 0; i < Math.min(counterOffers.length, 3); i++) {
        const offer = counterOffers[i];
        const savings = product.base_price - offer.price;
        message += `• ${offer.label}: ${offer.price}${currency}/${product.price_unit} (économie de ${savings}${currency})\n`;
    }

    message += `\nÇa vous intéresse ?`;

    return message;
}

/**
 * Calculate final price based on applied conditions
 */
function calculateFinalPrice(product, appliedConditions = []) {
    let price = product.base_price;
    const minPrice = product.min_negotiable || price;
    const logs = [];

    for (const condition of appliedConditions) {
        const oldPrice = price;

        switch (condition) {
            case 'engagement_12_mois':
                price = Math.round(price * 0.80); // -20%
                logs.push({ condition, discount: '20%', priceAfter: price });
                break;
            case 'paiement_annuel':
                price = Math.round(price * 0.85); // -15%
                logs.push({ condition, discount: '15%', priceAfter: price });
                break;
            case 'parrainage':
                price = price - 50; // -50€ fixed
                logs.push({ condition, discount: '50€', priceAfter: price });
                break;
            default:
                // Check for custom percentage discount
                const percentMatch = condition.match(/(\d+)%/);
                if (percentMatch) {
                    const discount = parseInt(percentMatch[1]) / 100;
                    price = Math.round(price * (1 - discount));
                    logs.push({ condition, discount: `${percentMatch[1]}%`, priceAfter: price });
                }
        }
    }

    // Ensure we don't go below minimum
    const finalPrice = Math.max(price, minPrice);

    return {
        basePrice: product.base_price,
        finalPrice,
        appliedConditions,
        totalDiscount: product.base_price - finalPrice,
        discountPercent: Math.round((1 - finalPrice / product.base_price) * 100),
        logs
    };
}

/**
 * Log a negotiation for analytics
 */
function logNegotiation(contactJid, productId, result) {
    const db = getDb();

    db.prepare(`
    INSERT INTO negotiation_logs 
    (contact_jid, product_id, requested_price, final_price, accepted, conditions_applied)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
        contactJid,
        productId,
        result.requestedPrice || null,
        result.finalPrice || null,
        result.accepted ? 1 : 0,
        JSON.stringify(result.appliedConditions || [])
    );
}

/**
 * Get negotiation analytics
 */
function getNegotiationStats() {
    const db = getDb();

    const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN accepted = 1 THEN 1 ELSE 0 END) as accepted,
      AVG(CASE WHEN accepted = 1 THEN final_price ELSE NULL END) as avg_final_price,
      AVG(CASE WHEN accepted = 1 THEN requested_price ELSE NULL END) as avg_requested_price
    FROM negotiation_logs
    WHERE created_at > datetime('now', '-30 days')
  `).get();

    const byProduct = db.prepare(`
    SELECT 
      p.name as product_name,
      COUNT(*) as negotiations,
      SUM(CASE WHEN nl.accepted = 1 THEN 1 ELSE 0 END) as accepted
    FROM negotiation_logs nl
    JOIN products p ON nl.product_id = p.id
    WHERE nl.created_at > datetime('now', '-30 days')
    GROUP BY nl.product_id
  `).all();

    return {
        last30Days: stats,
        byProduct,
        successRate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0
    };
}

// ==================== EXPORTS ====================

module.exports = {
    negotiate,
    generateCounterOffers,
    calculateFinalPrice,
    logNegotiation,
    getNegotiationStats
};
