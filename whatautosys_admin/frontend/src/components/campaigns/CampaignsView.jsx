import { useState, useEffect } from 'react';
import { Plus, Send, Users, Sparkles, Play, Pause, Trash2, Eye } from 'lucide-react';

export default function CampaignsView() {
    const [campaigns, setCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [activeTab, setActiveTab] = useState('broadcast');

    // Form state
    const [form, setForm] = useState({
        name: '',
        type: 'broadcast',
        template: '',
        ai_prompt: '',
        contacts: ''
    });

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        try {
            const res = await fetch('/api/campaigns');
            const data = await res.json();
            setCampaigns(data);
        } catch (error) {
            console.error('Error loading campaigns:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createCampaign = async () => {
        try {
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    type: activeTab === 'broadcast' ? 'broadcast' : 'hyper_personalized',
                    template: form.template,
                    ai_prompt: form.ai_prompt
                })
            });

            const data = await res.json();

            if (data.id) {
                // Import contacts
                if (form.contacts) {
                    await fetch(`/api/campaigns/${data.id}/contacts`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ numbers: form.contacts })
                    });
                }

                setShowModal(false);
                setForm({ name: '', type: 'broadcast', template: '', ai_prompt: '', contacts: '' });
                loadCampaigns();
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
        }
    };

    const startCampaign = async (id) => {
        try {
            await fetch(`/api/campaigns/${id}/start`, { method: 'POST' });
            loadCampaigns();
        } catch (error) {
            console.error('Error starting campaign:', error);
        }
    };

    const stopCampaign = async (id) => {
        try {
            await fetch(`/api/campaigns/${id}/stop`, { method: 'POST' });
            loadCampaigns();
        } catch (error) {
            console.error('Error stopping campaign:', error);
        }
    };

    const deleteCampaign = async (id) => {
        if (!confirm('Supprimer cette campagne ?')) return;

        try {
            await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
            loadCampaigns();
        } catch (error) {
            console.error('Error deleting campaign:', error);
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            draft: { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)', label: 'Brouillon' },
            running: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'En cours' },
            paused: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'En pause' },
            completed: { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Terminée' }
        };
        const style = config[status] || config.draft;
        return (
            <span className="status-badge" style={{ background: style.bg, color: style.color, border: 'none' }}>
                {style.label}
            </span>
        );
    };

    return (
        <div className="content-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ marginBottom: '6px', fontSize: '24px', fontWeight: 700 }}>Campagnes</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Envoyez des messages en masse avec personnalisation IA
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    Nouvelle Campagne
                </button>
            </div>

            {/* Campaigns List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {isLoading ? (
                    <div className="loading-overlay" style={{ position: 'relative', height: '200px' }}>
                        <div className="spinner" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="empty-state" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text-muted)'
                    }}>
                        <Send size={60} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Aucune campagne</h3>
                        <p style={{ textAlign: 'center', maxWidth: '400px', marginBottom: '24px' }}>
                            Créez votre première campagne pour envoyer des messages personnalisés à vos prospects.
                        </p>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={18} />
                            Créer une campagne
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {campaigns.map(campaign => (
                            <div key={campaign.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    background: campaign.type === 'hyper_personalized' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: campaign.type === 'hyper_personalized' ? '0 4px 12px rgba(249, 115, 22, 0.3)' : 'none'
                                }}>
                                    {campaign.type === 'hyper_personalized' ? (
                                        <Sparkles size={24} color="white" />
                                    ) : (
                                        <Send size={24} color={campaign.type === 'hyper_personalized' ? 'white' : 'var(--text-muted)'} />
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '16px' }}>{campaign.name}</span>
                                        {getStatusBadge(campaign.status)}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Users size={14} />
                                            {campaign.contacts_count} contacts
                                        </span>
                                        {campaign.sent_count > 0 && <span>• {campaign.sent_count} envoyés</span>}
                                        {campaign.failed_count > 0 && <span style={{ color: 'var(--danger)' }}>• {campaign.failed_count} échecs</span>}
                                    </div>
                                </div>

                                {/* Progress bar for running campaigns */}
                                {campaign.status === 'running' && campaign.contacts_count > 0 && (
                                    <div style={{ width: '160px' }}>
                                        <div style={{
                                            height: '6px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '3px',
                                            overflow: 'hidden',
                                            marginBottom: '6px'
                                        }}>
                                            <div style={{
                                                width: `${(campaign.sent_count / campaign.contacts_count) * 100}%`,
                                                height: '100%',
                                                background: 'var(--accent-gradient)',
                                                borderRadius: '3px',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {Math.round((campaign.sent_count / campaign.contacts_count) * 100)}% complété
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {campaign.status === 'draft' && (
                                        <button className="btn btn-primary btn-icon" onClick={() => startCampaign(campaign.id)} title="Lancer" style={{ width: '36px', height: '36px' }}>
                                            <Play size={18} />
                                        </button>
                                    )}
                                    {campaign.status === 'running' && (
                                        <button className="btn btn-secondary btn-icon" onClick={() => stopCampaign(campaign.id)} title="Arrêter" style={{ width: '36px', height: '36px' }}>
                                            <Pause size={18} />
                                        </button>
                                    )}
                                    <button className="btn btn-ghost btn-icon" onClick={() => setSelectedCampaign(campaign)} title="Détails" style={{ width: '36px', height: '36px' }}>
                                        <Eye size={18} />
                                    </button>
                                    <button className="btn btn-ghost btn-icon" onClick={() => deleteCampaign(campaign.id)} title="Supprimer" style={{ width: '36px', height: '36px', color: 'var(--danger)' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Campaign Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Nouvelle Campagne</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="modal-content">
                            {/* Campaign Type Tabs */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px' }}>
                                <button
                                    className={`btn ${activeTab === 'broadcast' ? 'btn-secondary active' : 'btn-ghost'}`}
                                    onClick={() => setActiveTab('broadcast')}
                                    style={{ flex: 1, borderRadius: '8px', justifyContent: 'center' }}
                                >
                                    <Send size={16} />
                                    Broadcast
                                </button>
                                <button
                                    className={`btn ${activeTab === 'hyper' ? 'btn-secondary active' : 'btn-ghost'}`}
                                    onClick={() => setActiveTab('hyper')}
                                    style={{ flex: 1, borderRadius: '8px', justifyContent: 'center' }}
                                >
                                    <Sparkles size={16} />
                                    Hyper-Perso
                                </button>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Nom de la campagne</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Ex: Promo Noël 2025"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">
                                    Numéros de téléphone (un par ligne)
                                </label>
                                <textarea
                                    className="input textarea"
                                    placeholder="+33612345678&#10;+33698765432&#10;..."
                                    value={form.contacts}
                                    onChange={(e) => setForm({ ...form, contacts: e.target.value })}
                                    rows={4}
                                />
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                    Copiez-collez votre liste de numéros ici.
                                </div>
                            </div>

                            {activeTab === 'broadcast' ? (
                                <div className="input-group">
                                    <label className="input-label">
                                        Message (utilisez {'{nom}'} et Spintax {'{option1|option2}'})
                                    </label>
                                    <textarea
                                        className="input textarea"
                                        placeholder="Bonjour {nom} ! {Découvrez|Profitez de} notre {offre|promo} spéciale..."
                                        value={form.template}
                                        onChange={(e) => setForm({ ...form, template: e.target.value })}
                                        rows={5}
                                    />
                                </div>
                            ) : (
                                <div className="input-group">
                                    <label className="input-label">
                                        Prompt pour l'IA (instructions de génération)
                                    </label>
                                    <textarea
                                        className="input textarea"
                                        placeholder="Écris un message de relance commercial pour {nom}. Mentionne subtilement leur besoin. Propose une démo. Ton professionnel mais chaleureux. 3-4 phrases max."
                                        value={form.ai_prompt}
                                        onChange={(e) => setForm({ ...form, ai_prompt: e.target.value })}
                                        rows={5}
                                    />
                                    <div style={{
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        marginTop: '12px',
                                        fontSize: '13px',
                                        color: '#60a5fa',
                                        display: 'flex',
                                        gap: '8px'
                                    }}>
                                        <Sparkles size={16} style={{ flexShrink: 0 }} />
                                        <span>L'IA générera un message unique pour chaque contact en utilisant les données de votre CSV</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                Annuler
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={createCampaign}
                                disabled={!form.name || !form.contacts}
                            >
                                Créer la campagne
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
