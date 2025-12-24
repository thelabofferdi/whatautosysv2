const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { getLicenseStatus, saveLicense, getHWID } = require('../utils/license-manager');

const upload = multer({ dest: 'uploads/' });

// Get machine HWID
router.get('/hwid', async (req, res) => {
    try {
        const hwid = await getHWID();
        res.json({ hwid });
    } catch (error) {
        res.status(500).json({ error: 'Impossible de récupérer le HWID', hwid: 'Erreur' });
    }
});

// Check activation status
router.get('/status', (req, res) => {
    const status = getLicenseStatus();
    res.json(status);
});

// Activate system with file upload
router.post('/activate', upload.single('licenseFile'), async (req, res) => {
    try {
        let result;

        // Case 1: File uploaded
        if (req.file) {
            const buffer = fs.readFileSync(req.file.path);
            result = await saveLicense(buffer);
            fs.unlinkSync(req.file.path); // cleanup
        }
        // Case 2: JSON body with fileData (base64) or fallback string
        else if (req.body.fileData) {
            result = await saveLicense({ fileData: req.body.fileData });
        }
        else if (req.body.licenseKey) {
            // Try to treat as base64 if it looks like one, or path? 
            // For now, assume it's data
            result = await saveLicense(Buffer.from(req.body.licenseKey, 'base64'));
        }
        else {
            return res.status(400).json({ error: 'Fichier de licence requis (.wlic)' });
        }

        if (result.success) {
            res.json({ success: true, message: 'Système activé avec succès' });
        } else {
            res.status(400).json({ success: false, error: result.message });
        }

    } catch (error) {
        console.error('Activation error:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verify license (v1 compatibility)
router.post('/verify', async (req, res) => {
    try {
        const { manager } = require('../utils/license-manager');
        const result = await manager.checkLicense();
        res.json(result);
    } catch (error) {
        res.status(500).json({ valid: false, message: 'Erreur de vérification' });
    }
});

module.exports = router;
