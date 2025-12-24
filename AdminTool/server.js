/**
 * 🔐 WHATAUTOSYS ADMIN LICENSE SERVER v2.1
 * Serveur web pour l'interface de génération de licences
 * Avec gestion des clés API Mistral depuis un fichier
 * 
 * Usage: node server.js
 * Puis ouvrir http://localhost:4000
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Importer les modules du backend parent
const { encryptLicense, generateLicenseId } = require('../whatautosys/backend/utils/license_crypto');

const app = express();
app.use(express.json());

// Servir l'interface HTML
app.use(express.static(__dirname));

// Configuration Multer pour upload de fichiers
const upload = multer({ dest: path.join(__dirname, 'temp_uploads') });

// Fichier de stockage des clés API
const API_KEYS_FILE = path.join(__dirname, 'api_keys.json');
const USED_KEYS_FILE = path.join(__dirname, 'used_keys.json');

// Charger les clés API disponibles
function loadApiKeys() {
    if (fs.existsSync(API_KEYS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf-8'));
        } catch (e) {
            return [];
        }
    }
    return [];
}

// Charger les clés utilisées (associées à un client)
function loadUsedKeys() {
    if (fs.existsSync(USED_KEYS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(USED_KEYS_FILE, 'utf-8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

// Sauvegarder les clés
function saveApiKeys(keys) {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
}

function saveUsedKeys(usedKeys) {
    fs.writeFileSync(USED_KEYS_FILE, JSON.stringify(usedKeys, null, 2));
}

// Obtenir une clé disponible
function getAvailableKey() {
    const allKeys = loadApiKeys();
    const usedKeys = loadUsedKeys();
    const usedKeysList = Object.values(usedKeys);

    const availableKey = allKeys.find(k => !usedKeysList.includes(k));
    return availableKey || null;
}

// Configuration du plan
const PRICING = {
    1: { days: 30, price: 15000, label: '1 mois' },
    3: { days: 90, price: 40000, label: '3 mois' },
    6: { days: 180, price: 75000, label: '6 mois' },
    12: { days: 365, price: 120000, label: '12 mois' }
};

const PLAN = {
    name: 'WhatAutosys Pro',
    code: 'pro',
    features: {
        marketing: true,
        aiAgent: true,
        conversations: true,
        scheduling: true,
        maxContacts: -1,
        maxCampaignsPerDay: -1
    }
};

// API - Upload des clés API Mistral
app.post('/api/upload-keys', upload.single('keysFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const filePath = req.file.path;
        const content = fs.readFileSync(filePath, 'utf-8');

        // Parser les clés - Format supporté:
        // {
        //   key1=zorGLo249sZnt3WnFKegdcq72nSWT2ib;
        //   key2=dNhp88tKP2eVUYz7DURIY2m5Jm2o9gXn;
        // }
        // ou simplement une clé par ligne

        const keys = [];

        // Regex pour extraire les valeurs après = et avant ;
        const keyValueRegex = /key\d*\s*=\s*([a-zA-Z0-9_-]+)\s*;?/g;
        let match;

        while ((match = keyValueRegex.exec(content)) !== null) {
            if (match[1] && match[1].length > 10) {
                keys.push(match[1]);
            }
        }

        // Si le format key=value n'a rien donné, essayer ligne par ligne (fallback)
        if (keys.length === 0) {
            content.split('\n').forEach(line => {
                const trimmed = line.trim()
                    .replace(/[{}]/g, '')  // Retirer { }
                    .replace(/;$/g, '')     // Retirer ; à la fin
                    .trim();

                if (trimmed.includes('=')) {
                    const value = trimmed.split('=')[1]?.trim();
                    if (value && value.length > 10) {
                        keys.push(value);
                    }
                } else if (trimmed.length > 10 && !trimmed.startsWith('#')) {
                    keys.push(trimmed);
                }
            });
        }

        // Fusionner avec les clés existantes (sans doublons)
        const existingKeys = loadApiKeys();
        const allKeys = [...new Set([...existingKeys, ...keys])];
        saveApiKeys(allKeys);

        // Supprimer le fichier temporaire
        fs.unlinkSync(filePath);

        const usedKeys = loadUsedKeys();
        const availableCount = allKeys.filter(k => !Object.values(usedKeys).includes(k)).length;

        console.log(`✅ ${keys.length} clés importées (${availableCount} disponibles)`);

        res.json({
            success: true,
            imported: keys.length,
            total: allKeys.length,
            available: availableCount
        });

    } catch (error) {
        console.error('❌ Erreur upload clés:', error);
        res.status(500).json({ error: error.message });
    }
});

// API - Statistiques des clés
app.get('/api/keys-stats', (req, res) => {
    const allKeys = loadApiKeys();
    const usedKeys = loadUsedKeys();
    const usedKeysList = Object.values(usedKeys);
    const availableCount = allKeys.filter(k => !usedKeysList.includes(k)).length;

    res.json({
        total: allKeys.length,
        used: usedKeysList.length,
        available: availableCount
    });
});

// API - Générer une licence
app.post('/api/generate', (req, res) => {
    try {
        const { hwid, clientName, clientEmail, months } = req.body;

        if (!hwid || hwid.length < 10) {
            return res.status(400).json({ error: 'HWID invalide (minimum 10 caractères)' });
        }

        if (!clientName) {
            return res.status(400).json({ error: 'Nom du client requis' });
        }

        // Obtenir une clé API disponible
        const apiKey = getAvailableKey();
        if (!apiKey) {
            return res.status(400).json({
                error: 'Aucune clé API disponible ! Importez des clés Mistral.'
            });
        }

        const pricing = PRICING[months] || PRICING[1];
        const licenseId = generateLicenseId();
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + pricing.days * 24 * 60 * 60 * 1000).toISOString();

        const licenseData = {
            id: licenseId,
            version: '2.0',
            product: 'WhatAutosys',
            hwid: hwid,
            plan: PLAN.code,
            planName: PLAN.name,
            features: PLAN.features,
            apiKey: apiKey,  // Clé attribuée automatiquement
            client: {
                name: clientName,
                email: clientEmail || '',
                paidAmount: pricing.price,
                currency: 'FCFA'
            },
            subscription: {
                duration: pricing.label,
                months: months
            },
            createdAt: createdAt,
            expiresAt: expiresAt,
            signature: `WA-${Buffer.from(hwid + licenseId).toString('base64').slice(0, 16)}`
        };

        // Chiffrer avec le vrai algorithme AES-256-GCM
        const encryptedBuffer = encryptLicense(licenseData);

        // Sauvegarder le fichier
        const safeClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `WhatAutosys_${safeClientName}_${months}mois_${licenseId}.wlic`;
        const outputDir = path.join(__dirname, 'generated_licenses');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, fileName);
        fs.writeFileSync(outputPath, encryptedBuffer);

        // Marquer la clé comme utilisée
        const usedKeys = loadUsedKeys();
        usedKeys[licenseId] = apiKey;
        saveUsedKeys(usedKeys);

        console.log(`✅ Licence générée: ${fileName}`);
        console.log(`   Client: ${clientName}, HWID: ${hwid.substring(0, 8)}...`);
        console.log(`   Clé API attribuée: ${apiKey.substring(0, 12)}...`);

        res.json({
            success: true,
            licenseId: licenseId,
            fileName: fileName,
            expiresAt: expiresAt,
            apiKeyUsed: apiKey.substring(0, 12) + '...',
            downloadUrl: `/download/${fileName}`
        });

    } catch (error) {
        console.error('❌ Erreur génération:', error);
        res.status(500).json({ error: error.message });
    }
});

// Télécharger un fichier de licence
app.get('/download/:fileName', (req, res) => {
    const filePath = path.join(__dirname, 'generated_licenses', req.params.fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    res.download(filePath);
});

// Liste des licences générées
app.get('/api/licenses', (req, res) => {
    const outputDir = path.join(__dirname, 'generated_licenses');

    if (!fs.existsSync(outputDir)) {
        return res.json([]);
    }

    const files = fs.readdirSync(outputDir)
        .filter(f => f.endsWith('.wlic'))
        .map(f => ({
            fileName: f,
            createdAt: fs.statSync(path.join(outputDir, f)).mtime
        }))
        .sort((a, b) => b.createdAt - a.createdAt);

    res.json(files);
});

// Démarrer le serveur
const PORT = 4000;
app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       🔐 WHATAUTOSYS LICENSE ADMIN SERVER v2.1            ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  🌐 Interface: http://localhost:${PORT}                       ║`);
    console.log('║  📁 Licences:  ./generated_licenses/                      ║');
    console.log('║  🔑 Clés API:  ./api_keys.json                            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    const stats = { total: 0, available: 0 };
    try {
        const allKeys = loadApiKeys();
        const usedKeys = loadUsedKeys();
        stats.total = allKeys.length;
        stats.available = allKeys.filter(k => !Object.values(usedKeys).includes(k)).length;
    } catch (e) { }

    console.log(`\n  📊 Clés API: ${stats.available}/${stats.total} disponibles`);
    console.log('');
});
