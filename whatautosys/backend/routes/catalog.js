const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const path = require('path');
const fs = require('fs');

// Get all products
router.get('/', (req, res) => {
    const db = getDb();
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();

    // Parse JSON fields
    const parsed = products.map(p => ({
        ...p,
        features: JSON.parse(p.features || '[]'),
        images: JSON.parse(p.images || '[]'),
        objections_responses: JSON.parse(p.objections_responses || '{}'),
        sales_arguments: JSON.parse(p.sales_arguments || '[]')
    }));

    res.json(parsed);
});

// Get single product
router.get('/:id', (req, res) => {
    const db = getDb();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    res.json({
        ...product,
        features: JSON.parse(product.features || '[]'),
        images: JSON.parse(product.images || '[]'),
        objections_responses: JSON.parse(product.objections_responses || '{}'),
        sales_arguments: JSON.parse(product.sales_arguments || '[]')
    });
});

// Create product
router.post('/', (req, res) => {
    const db = getDb();
    const id = uuidv4();

    const {
        name,
        category,
        description,
        features,
        images,
        base_price,
        currency,
        price_unit,
        min_negotiable,
        max_discount_percent,
        negotiation_conditions,
        target_audience,
        objections_responses,
        sales_arguments,
        cta_primary,
        cta_secondary
    } = req.body;

    if (!name || base_price === undefined) {
        return res.status(400).json({ error: 'Nom et prix sont requis' });
    }

    db.prepare(`
    INSERT INTO products (
      id, name, category, description, features, images,
      base_price, currency, price_unit, min_negotiable,
      max_discount_percent, negotiation_conditions, target_audience,
      objections_responses, sales_arguments, cta_primary, cta_secondary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        name,
        category || null,
        description || null,
        JSON.stringify(features || []),
        JSON.stringify(images || []),
        base_price,
        currency || 'EUR',
        price_unit || 'mois',
        min_negotiable || null,
        max_discount_percent || 0,
        negotiation_conditions || null,
        target_audience || null,
        JSON.stringify(objections_responses || {}),
        JSON.stringify(sales_arguments || []),
        cta_primary || null,
        cta_secondary || null
    );

    res.status(201).json({ id, message: 'Produit créé avec succès' });
});

// Update product
router.put('/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const {
        name,
        category,
        description,
        features,
        images,
        base_price,
        currency,
        price_unit,
        min_negotiable,
        max_discount_percent,
        negotiation_conditions,
        target_audience,
        objections_responses,
        sales_arguments,
        cta_primary,
        cta_secondary,
        is_active
    } = req.body;

    db.prepare(`
    UPDATE products SET
      name = ?,
      category = ?,
      description = ?,
      features = ?,
      images = ?,
      base_price = ?,
      currency = ?,
      price_unit = ?,
      min_negotiable = ?,
      max_discount_percent = ?,
      negotiation_conditions = ?,
      target_audience = ?,
      objections_responses = ?,
      sales_arguments = ?,
      cta_primary = ?,
      cta_secondary = ?,
      is_active = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
        name ?? existing.name,
        category ?? existing.category,
        description ?? existing.description,
        features ? JSON.stringify(features) : existing.features,
        images ? JSON.stringify(images) : existing.images,
        base_price ?? existing.base_price,
        currency ?? existing.currency,
        price_unit ?? existing.price_unit,
        min_negotiable ?? existing.min_negotiable,
        max_discount_percent ?? existing.max_discount_percent,
        negotiation_conditions ?? existing.negotiation_conditions,
        target_audience ?? existing.target_audience,
        objections_responses ? JSON.stringify(objections_responses) : existing.objections_responses,
        sales_arguments ? JSON.stringify(sales_arguments) : existing.sales_arguments,
        cta_primary ?? existing.cta_primary,
        cta_secondary ?? existing.cta_secondary,
        is_active ?? existing.is_active,
        id
    );

    res.json({ message: 'Produit mis à jour' });
});

// Delete product
router.delete('/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;

    // Get product to delete its images
    const product = db.prepare('SELECT images FROM products WHERE id = ?').get(id);

    if (product) {
        const images = JSON.parse(product.images || '[]');
        for (const img of images) {
            const imgPath = path.join(__dirname, '../../data', img);
            if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
            }
        }
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    res.json({ message: 'Produit supprimé' });
});

// Upload product image
router.post('/:id/images', (req, res) => {
    const upload = req.app.get('upload');

    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }

        const db = getDb();
        const { id } = req.params;

        const product = db.prepare('SELECT images FROM products WHERE id = ?').get(id);
        if (!product) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const images = JSON.parse(product.images || '[]');
        const imagePath = `/uploads/${req.file.filename}`;
        images.push(imagePath);

        db.prepare('UPDATE products SET images = ?, updated_at = datetime("now") WHERE id = ?')
            .run(JSON.stringify(images), id);

        res.json({ path: imagePath, images });
    });
});

// Delete product image
router.delete('/:id/images/:index', (req, res) => {
    const db = getDb();
    const { id, index } = req.params;

    const product = db.prepare('SELECT images FROM products WHERE id = ?').get(id);
    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const images = JSON.parse(product.images || '[]');
    const imageIndex = parseInt(index);

    if (imageIndex < 0 || imageIndex >= images.length) {
        return res.status(400).json({ error: 'Index d\'image invalide' });
    }

    // Delete file
    const imgPath = path.join(__dirname, '../../data', images[imageIndex]);
    if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
    }

    images.splice(imageIndex, 1);

    db.prepare('UPDATE products SET images = ?, updated_at = datetime("now") WHERE id = ?')
        .run(JSON.stringify(images), id);

    res.json({ images });
});

// Import products from CSV
router.post('/import', async (req, res) => {
    try {
        const upload = req.app.get('upload');

        upload.single('file')(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Aucun fichier fourni' });
            }

            const { parseProductsCSV } = require('../utils/file-parser');
            const products = await parseProductsCSV(req.file.path);

            const db = getDb();
            const insertStmt = db.prepare(`
        INSERT INTO products (id, name, category, description, base_price, currency, price_unit)
        VALUES (?, ?, ?, ?, ?, 'EUR', 'unité')
      `);

            let imported = 0;
            for (const product of products) {
                insertStmt.run(uuidv4(), product.name, product.category, product.description, product.price);
                imported++;
            }

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            res.json({ message: `${imported} produits importés avec succès`, count: imported });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
