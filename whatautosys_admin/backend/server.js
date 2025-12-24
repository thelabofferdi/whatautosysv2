const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
// Import the shared crypto logic - in real deployment this file should be copied or symlinked
// I'll assume we copied it to ./utils
const { encryptLicense, generateLicenseId } = require('./utils/license_crypto');

const app = express();
const PORT = 3002; // Admin backend on 3002

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Ensure upload dir exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

app.post('/api/generate-licenses', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    try {
        const content = fs.readFileSync(req.file.path, 'utf8');
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        const results = [];

        for (const line of lines) {
            // Simple parsing logic
            let key = line.trim();
            let clientName = 'Client';

            if (line.includes(',')) {
                [clientName, key] = line.split(',').map(s => s.trim());
            }

            if (key.length < 5) continue;

            const licenseData = {
                id: generateLicenseId(),
                client: { name: clientName },
                hwid: "ANY",
                apiKey: key,
                plan: "premium",
                planDetails: { name: "Premium", aiEnabled: true },
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            };

            const encrypted = encryptLicense(licenseData);
            const b64 = encrypted.toString('base64');

            results.push({
                client: clientName,
                key: b64,
                filename: `license_${clientName.replace(/\s+/g, '_')}.wlic`
            });
        }

        fs.unlinkSync(req.file.path);
        res.json({ success: true, licenses: results });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Admin Backend running on port ${PORT}`);
});
