import {
    MessageSquare,
    Send,
    Package,
    Target,
    Flame,
    Brain,
    Settings,
    Zap,
    Bot
} from 'lucide-react';

export default function Sidebar({ currentView, onNavigate, whatsappStatus, hotLeadsCount }) {
    const navItems = [
        { id: 'chat', label: 'Conversations', icon: MessageSquare },
        { id: 'campaigns', label: 'Campagnes', icon: Send },
        { id: 'catalog', label: 'Catalogue', icon: Package },
        { id: 'goals', label: 'Objectifs', icon: Target },
        { id: 'hotleads', label: 'Hot Leads', icon: Flame, badge: hotLeadsCount },
        { id: 'brain', label: 'Brain (IA)', icon: Brain },
        { id: 'playground', label: 'Simulateur IA', icon: Bot },
    ];

    const bottomItems = [
        { id: 'settings', label: 'Paramètres', icon: Settings },
    ];

    const getStatusLabel = () => {
        switch (whatsappStatus) {
            case 'connected': return 'Connecté';
            case 'connecting': return 'Connexion...';
            case 'qr_ready': return 'Scanner le QR';
            default: return 'Déconnecté';
        }
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Zap size={22} color="white" />
                    </div>
                    <span className="sidebar-logo-text">WhatAutosys</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-title">Menu</div>
                    {navItems.map(item => (
                        <div
                            key={item.id}
                            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                            onClick={() => onNavigate(item.id)}
                        >
                            <item.icon size={20} className="nav-item-icon" />
                            <span>{item.label}</span>
                            {item.badge > 0 && (
                                <span className="nav-item-badge">{item.badge}</span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="nav-section" style={{ marginTop: 'auto' }}>
                    {bottomItems.map(item => (
                        <div
                            key={item.id}
                            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                            onClick={() => onNavigate(item.id)}
                        >
                            <item.icon size={20} className="nav-item-icon" />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </nav>

            {/* Status */}
            <div style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <span className={`status-dot ${whatsappStatus === 'connected' ? 'online' : whatsappStatus === 'connecting' || whatsappStatus === 'qr_ready' ? 'connecting' : 'offline'}`} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {getStatusLabel()}
                </span>
            </div>
        </aside>
    );
}
