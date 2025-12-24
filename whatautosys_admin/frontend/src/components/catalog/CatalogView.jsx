import { useState, useEffect } from 'react';
import { Plus, Package, Edit, Trash2, X, Upload, Tag, DollarSign } from 'lucide-react';

export default function CatalogView() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [form, setForm] = useState({
        name: '',
        category: '',
        description: '',
        base_price: '',
        currency: 'EUR',
        price_unit: 'mois',
        min_negotiable: '',
        max_discount_percent: '',
        negotiation_conditions: '',
        target_audience: '',
        features: [''],
        sales_arguments: [''],
        cta_primary: '',
        cta_secondary: ''
    });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const res = await fetch('/api/catalog');
            const data = await res.json();
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            name: '',
            category: '',
            description: '',
            base_price: '',
            currency: 'EUR',
            price_unit: 'mois',
            min_negotiable: '',
            max_discount_percent: '',
            negotiation_conditions: '',
            target_audience: '',
            features: [''],
            sales_arguments: [''],
            cta_primary: '',
            cta_secondary: ''
        });
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            category: product.category || '',
            description: product.description || '',
            base_price: product.base_price,
            currency: product.currency || 'EUR',
            price_unit: product.price_unit || 'mois',
            min_negotiable: product.min_negotiable || '',
            max_discount_percent: product.max_discount_percent || '',
            negotiation_conditions: product.negotiation_conditions || '',
            target_audience: product.target_audience || '',
            features: product.features?.length ? product.features : [''],
            sales_arguments: product.sales_arguments?.length ? product.sales_arguments : [''],
            cta_primary: product.cta_primary || '',
            cta_secondary: product.cta_secondary || ''
        });
        setShowModal(true);
    };

    const saveProduct = async () => {
        const payload = {
            ...form,
            base_price: parseFloat(form.base_price),
            min_negotiable: form.min_negotiable ? parseFloat(form.min_negotiable) : null,
            max_discount_percent: form.max_discount_percent ? parseFloat(form.max_discount_percent) : 0,
            features: form.features.filter(f => f.trim()),
            sales_arguments: form.sales_arguments.filter(s => s.trim())
        };

        try {
            if (editingProduct) {
                await fetch(`/api/catalog/${editingProduct.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await fetch('/api/catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            setShowModal(false);
            setEditingProduct(null);
            resetForm();
            loadProducts();
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    const deleteProduct = async (id) => {
        if (!confirm('Supprimer ce produit ?')) return;

        try {
            await fetch(`/api/catalog/${id}`, { method: 'DELETE' });
            loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const addArrayField = (field) => {
        setForm({ ...form, [field]: [...form[field], ''] });
    };

    const updateArrayField = (field, index, value) => {
        const updated = [...form[field]];
        updated[index] = value;
        setForm({ ...form, [field]: updated });
    };

    const removeArrayField = (field, index) => {
        const updated = form[field].filter((_, i) => i !== index);
        setForm({ ...form, [field]: updated.length ? updated : [''] });
    };

    return (
        <div className="content-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ marginBottom: '6px', fontSize: '24px', fontWeight: 700 }}>Catalogue Produits</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Gérez vos produits pour une IA ultra-contextuelle
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary">
                        <Upload size={18} />
                        Importer CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setEditingProduct(null); setShowModal(true); }}>
                        <Plus size={18} />
                        Nouveau Produit
                    </button>
                </div>
            </div>

            {/* Products Grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {isLoading ? (
                    <div className="loading-overlay" style={{ position: 'relative', height: '200px' }}>
                        <div className="spinner" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="empty-state" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text-muted)'
                    }}>
                        <Package size={60} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Aucun produit</h3>
                        <p style={{ textAlign: 'center', maxWidth: '400px', marginBottom: '24px' }}>
                            Ajoutez vos produits pour que l'IA puisse répondre précisément aux questions de vos prospects.
                        </p>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={18} />
                            Ajouter un produit
                        </button>
                    </div>
                ) : (
                    <div className="product-grid">
                        {products.map(product => (
                            <div key={product.id} className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    height: '140px',
                                    background: 'rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderBottom: '1px solid var(--border-color)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {product.images?.length > 0 ? (
                                        <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <Package size={40} style={{ opacity: 0.3 }} />
                                    )}
                                    {product.category && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '12px',
                                            left: '12px',
                                            background: 'rgba(0,0,0,0.6)',
                                            backdropFilter: 'blur(4px)',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <Tag size={10} />
                                            {product.category}
                                        </div>
                                    )}
                                </div>

                                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 700, lineHeight: '1.3' }}>{product.name}</h3>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn btn-ghost btn-icon" onClick={() => openEditModal(product)} style={{ width: '28px', height: '28px', minWidth: '28px' }}>
                                                <Edit size={14} />
                                            </button>
                                            <button className="btn btn-ghost btn-icon" onClick={() => deleteProduct(product.id)} style={{ width: '28px', height: '28px', minWidth: '28px', color: 'var(--danger)' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                            {product.base_price} {product.currency === 'EUR' ? '€' : product.currency}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>/{product.price_unit}</span>
                                    </div>

                                    {product.features?.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', flex: 1 }}>
                                            {product.features.slice(0, 3).map((feat, i) => (
                                                <span key={i} style={{
                                                    fontSize: '11px',
                                                    background: 'rgba(255,255,255,0.06)',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    {feat}
                                                </span>
                                            ))}
                                            {product.features.length > 3 && (
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 4px' }}>
                                                    +{product.features.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {product.min_negotiable && (
                                        <div style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
                                            <DollarSign size={12} />
                                            Négo. min: {product.min_negotiable}€
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingProduct ? 'Modifier le produit' : 'Nouveau Produit'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="modal-content">
                            {/* Basic Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="input-group">
                                    <label className="input-label">Nom du produit *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Ex: Abonnement Pro"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Catégorie</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        placeholder="Ex: Service"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Description</label>
                                <textarea
                                    className="input textarea"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Description détaillée du produit pour l'IA..."
                                    rows={3}
                                />
                            </div>

                            {/* Pricing Card */}
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '20px',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    <DollarSign size={16} />
                                    Tarification et Négociation
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label className="input-label">Prix de base *</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={form.base_price}
                                            onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label className="input-label">Devise</label>
                                        <select
                                            className="input select"
                                            value={form.currency}
                                            onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                        >
                                            <option value="EUR">EUR (€)</option>
                                            <option value="USD">USD ($)</option>
                                        </select>
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label className="input-label">Unité</label>
                                        <select
                                            className="input select"
                                            value={form.price_unit}
                                            onChange={(e) => setForm({ ...form, price_unit: e.target.value })}
                                        >
                                            <option value="mois">/ mois</option>
                                            <option value="an">/ an</option>
                                            <option value="unité">/ unité</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label className="input-label">Prix min. négociable</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={form.min_negotiable}
                                            onChange={(e) => setForm({ ...form, min_negotiable: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label className="input-label">Remise max (%)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={form.max_discount_percent}
                                            onChange={(e) => setForm({ ...form, max_discount_percent: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Fields */}
                            <div className="input-group">
                                <label className="input-label">Fonctionnalités (une par ligne)</label>
                                {form.features.map((feat, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            className="input"
                                            value={feat}
                                            onChange={(e) => updateArrayField('features', i, e.target.value)}
                                            placeholder="Ex: Support 24/7"
                                        />
                                        <button className="btn btn-ghost btn-icon" onClick={() => removeArrayField('features', i)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button className="btn btn-secondary" onClick={() => addArrayField('features')} style={{ width: '100%', borderRadius: '8px' }}>
                                    <Plus size={14} /> Ajouter une fonctionnalité
                                </button>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Arguments de vente (pour IA)</label>
                                {form.sales_arguments.map((arg, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            className="input"
                                            value={arg}
                                            onChange={(e) => updateArrayField('sales_arguments', i, e.target.value)}
                                            placeholder="Ex: Augmente la productivité de 30%"
                                        />
                                        <button className="btn btn-ghost btn-icon" onClick={() => removeArrayField('sales_arguments', i)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button className="btn btn-secondary" onClick={() => addArrayField('sales_arguments')} style={{ width: '100%', borderRadius: '8px' }}>
                                    <Plus size={14} /> Ajouter un argument
                                </button>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                Annuler
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={saveProduct}
                                disabled={!form.name || !form.base_price}
                            >
                                {editingProduct ? 'Enregistrer' : 'Créer le produit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
