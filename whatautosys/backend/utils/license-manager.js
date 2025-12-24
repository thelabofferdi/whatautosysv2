/**
 * 🔐 WHATAUTOSYS LICENSE MANAGER v2.0
 * Gère les licences chiffrées au format .wlic
 * Inclut la clé API Mistral directement dans la licence
 */

const { machineId } = require('node-machine-id');
const fs = require('fs');
const path = require('path');
const { decryptLicense, isValidLicenseFile } = require('./license_crypto');

// Chemins de recherche pour les licences
const BASE_DIR = process.cwd();
const BACKEND_DIR = path.join(__dirname, '..');

class LicenseManager {
    constructor() {
        this.status = {
            valid: false,
            message: "Non initialisé",
            details: null,
            apiKey: null,
            plan: null
        };
        this.licenseData = null;
    }

    /**
     * Cherche un fichier de licence .wlic dans les emplacements possibles
     */
    findLicenseFile() {
        // Liste des chemins à vérifier
        const searchPaths = [
            path.join(BASE_DIR, 'license.wlic'),
            path.join(BASE_DIR, 'licence.wlic'),
            path.join(BACKEND_DIR, 'license.wlic'),
            path.join(BACKEND_DIR, '..', 'license.wlic'),
        ];

        // Chercher aussi les fichiers .wlic dans le dossier courant
        try {
            const files = fs.readdirSync(BASE_DIR);
            const wlicFiles = files.filter(f => f.endsWith('.wlic'));
            wlicFiles.forEach(f => searchPaths.push(path.join(BASE_DIR, f)));
        } catch (e) { }

        // Chercher dans le dossier backend
        try {
            const files = fs.readdirSync(BACKEND_DIR);
            const wlicFiles = files.filter(f => f.endsWith('.wlic'));
            wlicFiles.forEach(f => searchPaths.push(path.join(BACKEND_DIR, f)));
        } catch (e) { }

        // Retourner le premier fichier trouvé
        for (const p of searchPaths) {
            if (fs.existsSync(p)) {
                console.log(`[LICENSE] 📄 Fichier trouvé: ${p}`);
                return p;
            }
        }

        return null;
    }

    /**
     * Vérifie la licence
     */
    async checkLicense() {
        try {
            // 1. Récupérer le HWID actuel
            const currentHwid = await machineId();
            console.log(`[LICENSE] 🖥️ HWID Machine: ${currentHwid.substring(0, 8)}...`);

            // 2. Chercher le fichier de licence
            const licensePath = this.findLicenseFile();

            if (!licensePath) {
                this.status = {
                    valid: false,
                    message: "Aucune licence trouvée. Veuillez placer votre fichier .wlic dans le dossier de l'application.",
                    apiKey: null,
                    plan: null
                };
                console.log(`[LICENSE] 🔒 BLOQUÉ : ${this.status.message}`);
                return this.status;
            }

            // 3. Lire et déchiffrer le fichier
            const encryptedData = fs.readFileSync(licensePath);

            if (!isValidLicenseFile(encryptedData)) {
                this.status = {
                    valid: false,
                    message: "Fichier de licence invalide ou corrompu.",
                    apiKey: null,
                    plan: null
                };
                return this.status;
            }

            const licenseData = decryptLicense(encryptedData);

            if (!licenseData) {
                this.status = {
                    valid: false,
                    message: "Impossible de déchiffrer la licence. Fichier corrompu ou altéré.",
                    apiKey: null,
                    plan: null
                };
                return this.status;
            }

            // 4. Vérifier le HWID
            if (licenseData.hwid !== currentHwid) {
                this.status = {
                    valid: false,
                    message: `Licence enregistrée pour une autre machine.\n\nVotre ID: ${currentHwid.substring(0, 16)}...\nID Licence: ${licenseData.hwid.substring(0, 16)}...`,
                    apiKey: null,
                    plan: null
                };
                return this.status;
            }

            // 5. Vérifier l'expiration
            if (licenseData.expiresAt) {
                const now = new Date();
                const exp = new Date(licenseData.expiresAt);
                if (now > exp) {
                    this.status = {
                        valid: false,
                        message: `Licence EXPIRÉE le ${exp.toLocaleDateString('fr-FR')}. Veuillez renouveler votre abonnement.`,
                        apiKey: null,
                        plan: licenseData.plan
                    };
                    return this.status;
                }
            }

            // 6. TOUT EST BON ! Stocker les données
            this.licenseData = licenseData;
            this.status = {
                valid: true,
                message: "Licence Active",
                details: {
                    id: licenseData.id,
                    plan: licenseData.plan,
                    planName: licenseData.planDetails?.name || licenseData.plan,
                    client: licenseData.client?.name || 'Client',
                    expiresAt: licenseData.expiresAt,
                    createdAt: licenseData.createdAt
                },
                apiKey: licenseData.apiKey || null,
                plan: licenseData.plan,
                planDetails: licenseData.planDetails
            };

            // Store globally for mistral-ai.js to access
            global.licenseData = licenseData;

            // Initialize Mistral AI if API key is present
            if (licenseData.apiKey) {
                try {
                    const { initMistralAI } = require('../mistral-ai');
                    initMistralAI(licenseData.apiKey);
                    console.log('[LICENSE] 🔑 Mistral AI initialisé avec la clé de licence');
                } catch (e) {
                    console.error('[LICENSE] ⚠️ Erreur initialisation Mistral:', e.message);
                }
            }

            console.log(`[LICENSE] ✅ Licence valide: ${licenseData.id} (${licenseData.planDetails?.name || licenseData.plan})`);

            return this.status;

        } catch (e) {
            console.error('[LICENSE] ❌ Erreur validation licence:', e.message);
            this.status = {
                valid: false,
                message: "Erreur lors de la validation de la licence: " + e.message,
                apiKey: null,
                plan: null
            };
            return this.status;
        }
    }

    /**
     * Récupère le HWID de la machine
     */
    getHWID() {
        return machineId();
    }

    /**
     * Récupère la clé API depuis la licence
     */
    getApiKey() {
        return this.status.apiKey || (this.licenseData ? this.licenseData.apiKey : null);
    }

    /**
     * Vérifie si l'IA est disponible pour ce plan
     */
    isAIEnabled() {
        if (!this.licenseData) return false;
        return this.licenseData.planDetails?.aiEnabled === true && !!this.licenseData.apiKey;
    }

    /**
     * Récupère les limites du plan
     */
    getPlanLimits() {
        if (!this.licenseData || !this.licenseData.planDetails) {
            return { maxContacts: 0, maxCampaignsPerDay: 0, aiEnabled: false };
        }
        return this.licenseData.planDetails;
    }

    /**
     * Installe une nouvelle licence depuis un buffer ou un chemin
     */
    async installLicense(data) {
        try {
            let buffer;

            // Si c'est un chemin de fichier
            if (typeof data === 'string' && fs.existsSync(data)) {
                buffer = fs.readFileSync(data);
            }
            // Si c'est déjà un buffer
            else if (Buffer.isBuffer(data)) {
                buffer = data;
            }
            // Si c'est un objet avec les données en base64
            else if (data && data.fileData) {
                buffer = Buffer.from(data.fileData, 'base64');
            }
            else {
                return { success: false, message: "Format de données invalide" };
            }

            // Vérifier que c'est un fichier valide
            if (!isValidLicenseFile(buffer)) {
                return { success: false, message: "Ce n'est pas un fichier de licence WhatAutosys valide." };
            }

            // Déchiffrer pour vérifier
            const licenseData = decryptLicense(buffer);
            if (!licenseData) {
                return { success: false, message: "Licence corrompue ou falsifiée." };
            }

            // Vérifier le HWID
            const currentHwid = await machineId();
            if (licenseData.hwid !== currentHwid) {
                return {
                    success: false,
                    message: `Cette licence est enregistrée pour une autre machine.\n\nVotre HWID: ${currentHwid}`
                };
            }

            // Sauvegarder le fichier
            const targetPath = path.join(BACKEND_DIR, 'license.wlic');
            fs.writeFileSync(targetPath, buffer);

            // Recharger la licence
            await this.checkLicense();

            return {
                success: true,
                valid: this.status.valid,
                message: this.status.message,
                plan: this.status.plan
            };

        } catch (e) {
            console.error('[LICENSE] Erreur installation:', e);
            return { success: false, message: "Erreur lors de l'installation: " + e.message };
        }
    }
}

// Instance unique du gestionnaire de licence
const manager = new LicenseManager();

// Export wrappers to match server codes
module.exports = {
    // Instance du gestionnaire
    manager,

    // Fonctions d'adaptation pour le serveur
    loadLicense: async () => await manager.checkLicense(),
    getLicenseStatus: () => {
        return {
            activated: manager.status.valid,
            details: manager.status.valid ? manager.status.details : null,
            error: !manager.status.valid ? manager.status.message : null
        };
    },
    saveLicense: async (buffer) => await manager.installLicense(buffer),
    getHWID: async () => await manager.getHWID()
};
