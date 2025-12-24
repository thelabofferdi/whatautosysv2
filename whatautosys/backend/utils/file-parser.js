const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parse different document types and extract text content
 * @param {string} filePath - Path to the document
 * @returns {string} - Extracted text content
 */
async function parseDocument(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
        case '.pdf':
            return await parsePDF(filePath);
        case '.docx':
            return await parseDOCX(filePath);
        case '.txt':
            return await parseTXT(filePath);
        case '.csv':
            return await parseCSV(filePath);
        default:
            throw new Error(`Format de fichier non supporté: ${ext}`);
    }
}

/**
 * Parse PDF files
 */
async function parsePDF(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error(`Erreur lors du parsing PDF: ${error.message}`);
    }
}

/**
 * Parse DOCX files
 */
async function parseDOCX(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    } catch (error) {
        console.error('Error parsing DOCX:', error);
        throw new Error(`Erreur lors du parsing DOCX: ${error.message}`);
    }
}

/**
 * Parse TXT files
 */
async function parseTXT(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error('Error parsing TXT:', error);
        throw new Error(`Erreur lors de la lecture du fichier: ${error.message}`);
    }
}

/**
 * Parse CSV files and return as structured text
 */
async function parseCSV(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        if (lines.length === 0) return '';

        // Parse header
        const header = parseCSVLine(lines[0]);

        // Parse data rows
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = parseCSVLine(lines[i]);
                const row = {};
                header.forEach((col, idx) => {
                    row[col] = values[idx] || '';
                });
                rows.push(row);
            }
        }

        return { header, rows };
    } catch (error) {
        console.error('Error parsing CSV:', error);
        throw new Error(`Erreur lors du parsing CSV: ${error.message}`);
    }
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

/**
 * Parse contacts from CSV for campaigns
 */
async function parseContactsCSV(filePath) {
    const data = await parseCSV(filePath);

    if (!data.rows || data.rows.length === 0) {
        throw new Error('Le fichier CSV est vide');
    }

    const contacts = [];

    // Find phone column (flexible naming)
    const phoneColumns = ['numero', 'phone', 'telephone', 'tel', 'mobile', 'whatsapp'];
    const phoneCol = data.header.find(h =>
        phoneColumns.some(p => h.toLowerCase().includes(p))
    );

    if (!phoneCol) {
        throw new Error('Colonne téléphone non trouvée. Utilisez: numero, phone, telephone, tel, mobile ou whatsapp');
    }

    // Find name column
    const nameColumns = ['nom', 'name', 'prenom', 'firstname', 'contact'];
    const nameCol = data.header.find(h =>
        nameColumns.some(n => h.toLowerCase().includes(n))
    );

    for (const row of data.rows) {
        const phone = cleanPhoneNumber(row[phoneCol]);

        if (phone) {
            contacts.push({
                phone,
                name: nameCol ? row[nameCol] : null,
                // Include all other columns as custom data
                customData: { ...row }
            });
        }
    }

    return contacts;
}

/**
 * Clean and format phone number
 */
function cleanPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-numeric characters except +
    let cleaned = phone.toString().replace(/[^\d+]/g, '');

    // Ensure it starts with country code
    if (cleaned.startsWith('0')) {
        // Assume French number if starts with 0
        cleaned = '33' + cleaned.substring(1);
    }

    // Remove leading + if present
    cleaned = cleaned.replace(/^\+/, '');

    // Validate length (minimum 10 digits)
    if (cleaned.length < 10) return null;

    return cleaned;
}

/**
 * Parse products from CSV for catalog import
 */
async function parseProductsCSV(filePath) {
    const data = await parseCSV(filePath);

    if (!data.rows || data.rows.length === 0) {
        throw new Error('Le fichier CSV est vide');
    }

    const products = [];

    // Required columns
    const requiredColumns = ['name', 'nom', 'produit', 'product'];
    const nameCol = data.header.find(h =>
        requiredColumns.some(r => h.toLowerCase().includes(r))
    );

    if (!nameCol) {
        throw new Error('Colonne nom de produit non trouvée');
    }

    // Price columns
    const priceColumns = ['prix', 'price', 'tarif', 'cout'];
    const priceCol = data.header.find(h =>
        priceColumns.some(p => h.toLowerCase().includes(p))
    );

    for (const row of data.rows) {
        const name = row[nameCol];
        if (!name) continue;

        let price = 0;
        if (priceCol && row[priceCol]) {
            price = parseFloat(row[priceCol].replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        }

        products.push({
            name,
            price,
            category: row.category || row.categorie || null,
            description: row.description || null,
            // Include all columns as additional data
            rawData: { ...row }
        });
    }

    return products;
}

// ==================== EXPORTS ====================

module.exports = {
    parseDocument,
    parsePDF,
    parseDOCX,
    parseTXT,
    parseCSV,
    parseContactsCSV,
    parseProductsCSV,
    cleanPhoneNumber
};
