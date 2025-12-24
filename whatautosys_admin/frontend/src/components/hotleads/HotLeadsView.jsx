import { useState, useEffect } from 'react';
import { Flame, Phone, MessageSquare, Clock, Check, ExternalLink, User } from 'lucide-react';

export default function HotLeadsView({ onCountUpdate }) {
    const [leads, setLeads] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, handled

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        try {
            const res = await fetch('/api/hotleads');
            const data = await res.json();
            setLeads(data);

            // Update count
            const pendingCount = data.filter(l => !l.handled).length;
            onCountUpdate?.(pendingCount);
        } catch (error) {
            console.error('Error loading hot leads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsHandled = async (id) => {
        // In a real app, this would be an API call
        setLeads(prev => prev.map(l =>
            l.id === id ? { ...l, handled: 1, handled_at: new Date().toISOString() } : l
        ));
        onCountUpdate?.(leads.filter(l => !l.handled && l.id !== id).length);
    };

    const filteredLeads = leads.filter(lead => {
        if (filter === 'pending') return !lead.handled;
        if (filter === 'handled') return lead.handled;
        return true;
    });

    const getScoreColor = (score) => {
        if (score >= 80) return 'var(--danger)';
        if (score >= 60) return 'var(--warning)';
        return 'var(--info)';
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'À l\'instant';
        if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
        return date.toLocaleDateString('fr-FR');
    };

    const parseSignals = (signals) => {
        try {
            return typeof signals === 'string' ? JSON.parse(signals) : signals;
        } catch {
            return [];
        }
    };

    const getSignalLabel = (type) => {
        const labels = {
            pricing_question: '💰 Question prix',
            urgency: '⏰ Urgence',
            demo_request: '🎯 Demande démo',
            competitor_mention: '🏢 Mention concurrent',
            payment_question: '💳 Question paiement',
            buying_intent: '🛒 Intention d\'achat'
        };
        return labels[type] || type;
    };

    return (
        <div className="content-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ marginBottom: '4px', fontSize: '24px' }}>
                        Hot Leads
                        {leads.filter(l => !l.handled).length > 0 && (
                            <span className="status-badge" style={{
                                marginLeft: '12px',
                                background: 'var(--danger-bg)',
                                color: 'var(--danger)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                display: 'inline-flex',
                                fontSize: '13px'
                            }}>
                                {leads.filter(l => !l.handled).length} en attente
                            </span>
                        )}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Prospects à haute intention détectés par l'IA
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
                <button
                    className={`btn ${filter === 'all' ? 'btn-secondary active' : 'btn-ghost'}`}
                    onClick={() => setFilter('all')}
                    style={filter === 'all' ? { borderColor: 'var(--accent-primary)', color: 'white' } : {}}
                >
                    Tous ({leads.length})
                </button>
                <button
                    className={`btn ${filter === 'pending' ? 'btn-secondary active' : 'btn-ghost'}`}
                    onClick={() => setFilter('pending')}
                    style={filter === 'pending' ? { borderColor: 'var(--accent-primary)', color: 'white' } : {}}
                >
                    À traiter ({leads.filter(l => !l.handled).length})
                </button>
                <button
                    className={`btn ${filter === 'handled' ? 'btn-secondary active' : 'btn-ghost'}`}
                    onClick={() => setFilter('handled')}
                    style={filter === 'handled' ? { borderColor: 'var(--accent-primary)', color: 'white' } : {}}
                >
                    Traités ({leads.filter(l => l.handled).length})
                </button>
            </div>

            {/* Leads List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                {isLoading ? (
                    <div className="loading-overlay" style={{ position: 'relative', height: '200px' }}>
                        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="empty-state">
                        <Flame size={60} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
                            {filter === 'pending' ? 'Aucun hot lead en attente' : 'Aucun hot lead'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Les prospects chauds apparaîtront ici automatiquement
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredLeads.map(lead => {
                            const signals = parseSignals(lead.signals);

                            return (
                                <div
                                    key={lead.id}
                                    className="card"
                                    style={{
                                        borderLeft: `4px solid ${getScoreColor(lead.score)}`,
                                        opacity: lead.handled ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '20px'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                                        {/* Score Circle */}
                                        <div style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            background: `conic-gradient(${getScoreColor(lead.score)} ${lead.score}%, rgba(255,255,255,0.05) 0)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                        }}>
                                            <div style={{
                                                width: '54px',
                                                height: '54px',
                                                borderRadius: '50%',
                                                background: '#1c1917', /* Match background or dark */
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 800,
                                                fontSize: '18px',
                                                color: getScoreColor(lead.score)
                                            }}>
                                                {lead.score}
                                            </div>
                                        </div>

                                        {/* Lead Info */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '16px', color: 'white' }}>
                                                    {lead.contact_name || lead.contact_jid?.split('@')[0] || 'Contact inconnu'}
                                                </span>
                                                {lead.handled && (
                                                    <span className="status-badge" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                                                        <Check size={12} style={{ marginRight: '4px' }} />
                                                        Traité
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                                <Phone size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                                {lead.contact_jid?.split('@')[0]}
                                                <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
                                                <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                                {formatTime(lead.detected_at)}
                                            </div>

                                            {/* Signals */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {signals.filter(s => s.weight > 0).map((signal, i) => (
                                                    <span
                                                        key={i}
                                                        className="status-badge"
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            fontSize: '11px',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            color: 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        {getSignalLabel(signal.type)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                                            {!lead.handled && (
                                                <>
                                                    <button className="btn btn-secondary" style={{ fontSize: '13px', height: '36px' }}>
                                                        <Phone size={14} />
                                                        Appeler
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ fontSize: '13px', height: '36px' }}
                                                        onClick={() => markAsHandled(lead.id)}
                                                    >
                                                        <Check size={14} />
                                                        Marquer traité
                                                    </button>
                                                </>
                                            )}
                                            <button className="btn btn-ghost" style={{ fontSize: '13px', height: '36px' }}>
                                                <MessageSquare size={14} />
                                                Voir conversation
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
