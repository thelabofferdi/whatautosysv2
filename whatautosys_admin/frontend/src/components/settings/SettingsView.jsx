import { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Zap, Download, Save, Key, MessageSquare } from 'lucide-react';

export default function SettingsView() {
    const [settings, setSettings] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async (newSettings) => {
        setIsSaving(true);
        try {
            await fetch('/api/settings/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: newSettings })
            });
            setSettings({ ...settings, ...newSettings });
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateSetting = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
    };

    const testTelegram = async () => {
        try {
            const res = await fetch('/api/settings/notifications/telegram/test', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert('✅ Test envoyé avec succès !');
            } else {
                alert('❌ Erreur: ' + data.error);
            }
        } catch (error) {
            alert('❌ Erreur: ' + error.message);
        }
    };

    const exportData = () => {
        window.open('/api/settings/export', '_blank');
    };

    if (isLoading) {
        return (
            <div className="loading-overlay" style={{ position: 'relative', height: '100%', width: '100%' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="content-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ marginBottom: '6px', fontSize: '24px', fontWeight: 700 }}>Paramètres</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Configurez le comportement de votre assistant IA
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', maxWidth: '600px' }}>
                {[
                    { id: 'general', icon: Settings, label: 'Général' },
                    { id: 'antiban', icon: Shield, label: 'Sécurité Anti-Ban' },
                    { id: 'notifications', icon: Bell, label: 'Notifications' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-secondary active' : 'btn-ghost'}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ flex: 1, borderRadius: '8px', justifyContent: 'center' }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxWidth: '800px' }}>
                {/* General Settings */}
                {activeTab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ padding: '8px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '8px' }}>
                                    <Zap size={20} color="var(--accent-primary)" />
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Mode Co-Pilot</h3>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                                Affiche des suggestions IA en temps réel dans les conversations pour vous aider à répondre plus vite.
                            </p>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.co_pilot_enabled === 'true'}
                                    onChange={(e) => {
                                        updateSetting('co_pilot_enabled', e.target.checked ? 'true' : 'false');
                                        saveSettings({ co_pilot_enabled: e.target.checked ? 'true' : 'false' });
                                    }}
                                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)' }}
                                />
                                <span style={{ fontWeight: 500 }}>Activer le mode Co-Pilot</span>
                            </label>
                        </div>

                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                                    <MessageSquare size={20} color="var(--info)" />
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Réponse Automatique</h3>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                                L'IA répond automatiquement aux messages entrants en utilisant votre base de connaissances.
                            </p>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.auto_reply_enabled === 'true'}
                                    onChange={(e) => {
                                        updateSetting('auto_reply_enabled', e.target.checked ? 'true' : 'false');
                                        saveSettings({ auto_reply_enabled: e.target.checked ? 'true' : 'false' });
                                    }}
                                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)' }}
                                />
                                <span style={{ fontWeight: 500 }}>Activer les réponses automatiques</span>
                            </label>
                        </div>

                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                                    <Download size={20} color="white" />
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Export Données</h3>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                                Téléchargez toutes vos données (conversations, contacts, campagnes) au format JSON.
                            </p>
                            <button className="btn btn-secondary" onClick={exportData}>
                                <Download size={16} />
                                Exporter mes données
                            </button>
                        </div>
                    </div>
                )}

                {/* Anti-Ban Settings */}
                {activeTab === 'antiban' && (
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px' }}>
                                <Shield size={20} color="var(--success)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Configuration Anti-Ban</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Imitez le comportement humain pour éviter les blocages.</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group">
                                <label className="input-label">Délai min. entre messages (ms)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={settings.anti_ban_min_delay || 15000}
                                    onChange={(e) => updateSetting('anti_ban_min_delay', e.target.value)}
                                />
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Reco: 15s (15000ms)</div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Délai max. entre messages (ms)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={settings.anti_ban_max_delay || 45000}
                                    onChange={(e) => updateSetting('anti_ban_max_delay', e.target.value)}
                                />
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Reco: 45s (45000ms)</div>
                            </div>
                        </div>

                        <div style={{ margin: '20px 0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.anti_ban_typing_enabled === 'true'}
                                    onChange={(e) => updateSetting('anti_ban_typing_enabled', e.target.checked ? 'true' : 'false')}
                                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)' }}
                                />
                                <span>Simuler l'indcateur "en train d'écrire..."</span>
                            </label>
                        </div>

                        <div style={{
                            background: 'var(--warning-bg)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '24px',
                            display: 'flex',
                            gap: '12px'
                        }}>
                            <Shield size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <strong>Attention :</strong> L'utilisation d'outils d'automatisation sur WhatsApp comporte toujours un risque. Utilisez des délais raisonnables et évitez le spam massif.
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={() => saveSettings({
                                anti_ban_min_delay: settings.anti_ban_min_delay,
                                anti_ban_max_delay: settings.anti_ban_max_delay,
                                anti_ban_typing_enabled: settings.anti_ban_typing_enabled
                            })}
                            disabled={isSaving}
                        >
                            <Save size={16} />
                            {isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                        </button>
                    </div>
                )}

                {/* Notifications Settings */}
                {activeTab === 'notifications' && (
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                                <Bell size={20} color="var(--info)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Notifications Telegram</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Recevez des alertes "Hot Lead" directement sur Telegram.</p>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Token du Bot Telegram</label>
                            <input
                                type="password"
                                className="input"
                                value={settings.telegram_bot_token || ''}
                                onChange={(e) => updateSetting('telegram_bot_token', e.target.value)}
                                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Chat ID</label>
                            <input
                                type="text"
                                className="input"
                                value={settings.telegram_chat_id || ''}
                                onChange={(e) => updateSetting('telegram_chat_id', e.target.value)}
                                placeholder="123456789"
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Seuil Hot Lead (Score min. 0-100)</label>
                            <input
                                type="number"
                                className="input"
                                value={settings.hot_lead_threshold || 70}
                                onChange={(e) => updateSetting('hot_lead_threshold', e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => saveSettings({
                                    telegram_bot_token: settings.telegram_bot_token,
                                    telegram_chat_id: settings.telegram_chat_id,
                                    hot_lead_threshold: settings.hot_lead_threshold
                                })}
                                disabled={isSaving}
                            >
                                <Save size={16} />
                                Enregistrer
                            </button>

                            <button
                                className="btn btn-secondary"
                                onClick={testTelegram}
                                disabled={!settings.telegram_bot_token || !settings.telegram_chat_id}
                            >
                                Envoyer un test
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
