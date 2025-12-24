/**
 * 🔐 WHATAUTOSYS LICENSE CRYPTO
 * Module de chiffrement/déchiffrement pour fichiers .wlic
 * Utilise AES-256-GCM pour une sécurité maximale
 */

const crypto = require('crypto');

// Clé de chiffrement secrète (32 bytes pour AES-256)
// ⚠️ CETTE CLÉ DOIT RESTER SECRÈTE ET NE JAMAIS ÊTRE PARTAGÉE
// On utilise SHA256 de la passphrase pour garantir 32 bytes
const SECRET_PASSPHRASE = 'WhatAutosys2024!SecretLicenseKey';
const SECRET_KEY = crypto.createHash('sha256').update(SECRET_PASSPHRASE).digest();
const ALGORITHM = 'aes-256-gcm';
const FILE_SIGNATURE = 'WLIC'; // Magic bytes pour identifier les fichiers

/**
 * Chiffre les données de licence
 * @param {Object} licenseData - Données de licence à chiffrer
 * @returns {Buffer} - Données chiffrées avec signature
 */
function encryptLicense(licenseData) {
    // Générer un IV unique
    const iv = crypto.randomBytes(16);

    // Créer le cipher
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

    // Convertir les données en JSON puis en buffer
    const jsonData = JSON.stringify(licenseData);
    const encrypted = Buffer.concat([
        cipher.update(jsonData, 'utf8'),
        cipher.final()
    ]);

    // Récupérer le tag d'authentification
    const authTag = cipher.getAuthTag();

    // Créer le fichier final avec la structure:
    // [SIGNATURE 4 bytes][VERSION 1 byte][IV 16 bytes][AUTH_TAG 16 bytes][ENCRYPTED DATA]
    const version = Buffer.from([0x01]); // Version 1
    const signature = Buffer.from(FILE_SIGNATURE, 'utf8');

    return Buffer.concat([
        signature,   // 4 bytes: "WLIC"
        version,     // 1 byte: version du format
        iv,          // 16 bytes: IV
        authTag,     // 16 bytes: Auth tag
        encrypted    // N bytes: Données chiffrées
    ]);
}

/**
 * Déchiffre les données de licence
 * @param {Buffer} encryptedData - Données chiffrées
 * @returns {Object|null} - Données de licence ou null si invalide
 */
function decryptLicense(encryptedData) {
    try {
        // Vérifier la signature
        const signature = encryptedData.slice(0, 4).toString('utf8');
        if (signature !== FILE_SIGNATURE) {
            console.error('[LICENSE_CRYPTO] Signature invalide');
            return null;
        }

        // Lire la version
        const version = encryptedData[4];
        if (version !== 0x01) {
            console.error('[LICENSE_CRYPTO] Version non supportée:', version);
            return null;
        }

        // Extraire les composants
        const iv = encryptedData.slice(5, 21);           // 16 bytes
        const authTag = encryptedData.slice(21, 37);     // 16 bytes
        const encrypted = encryptedData.slice(37);       // Reste

        // Créer le decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
        decipher.setAuthTag(authTag);

        // Déchiffrer
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        // Parser le JSON
        return JSON.parse(decrypted.toString('utf8'));

    } catch (error) {
        console.error('[LICENSE_CRYPTO] Erreur de déchiffrement:', error.message);
        return null;
    }
}

/**
 * Vérifie si un fichier est un fichier de licence valide
 * @param {Buffer} data - Données du fichier
 * @returns {boolean}
 * This checks the magic bytes "WLIC"
 */
function isValidLicenseFile(data) {
    if (!Buffer.isBuffer(data) || data.length < 37) {
        return false;
    }
    const signature = data.slice(0, 4).toString('utf8');
    return signature === FILE_SIGNATURE;
}

/**
 * Génère un ID de licence unique
 * @returns {string}
 */
function generateLicenseId() {
    return 'WL-' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

module.exports = {
    encryptLicense,
    decryptLicense,
    isValidLicenseFile,
    generateLicenseId,
    FILE_SIGNATURE
};
