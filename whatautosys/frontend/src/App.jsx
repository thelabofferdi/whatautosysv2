import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ChatView from './components/chat/ChatView';
import CampaignsView from './components/campaigns/CampaignsView';
import CatalogView from './components/catalog/CatalogView';
import GoalsView from './components/goals/GoalsView';
import HotLeadsView from './components/hotleads/HotLeadsView';
import BrainView from './components/brain/BrainView';
import SettingsView from './components/settings/SettingsView';
import QRCodeView from './components/QRCodeView';
import PlaygroundView from './components/playground/PlaygroundView';
import ActivationScreen from './components/ActivationScreen';

// Initialize Socket.IO connection
const socket = io('http://localhost:3001', {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
});

export default function App() {
    const [currentView, setCurrentView] = useState('chat');
    const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
    const [qrCode, setQrCode] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [hotLeadsCount, setHotLeadsCount] = useState(0);
    const [stats, setStats] = useState({});

    // License State
    const [isActivated, setIsActivated] = useState(null); // null = loading

    // Check activation status
    const checkActivation = useCallback(async () => {
        try {
            const res = await fetch('/api/system/status');
            const data = await res.json();
            setIsActivated(data.activated);
        } catch (error) {
            console.error('Failed to check activation:', error);
            // Default to false on error to be safe, or retry
            setIsActivated(false);
        }
    }, []);

    useEffect(() => {
        checkActivation();
    }, [checkActivation]);

    // Fetch initial data
    const fetchData = useCallback(async () => {
        if (!isActivated) return;

        try {
            // Fetch WhatsApp status
            const statusRes = await fetch('/api/whatsapp/status');
            const statusData = await statusRes.json();
            setWhatsappStatus(statusData.status);
            if (statusData.qrCode) setQrCode(statusData.qrCode);

            // Fetch conversations
            const convRes = await fetch('/api/whatsapp/conversations');
            const convData = await convRes.json();
            setConversations(convData);

            // Fetch stats
            const statsRes = await fetch('/api/settings/stats/overview');
            const statsData = await statsRes.json();
            setStats(statsData);
            setHotLeadsCount(statsData.pending_hot_leads || 0);

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }, [isActivated]);

    // Socket.IO event handlers
    useEffect(() => {
        if (!isActivated) return;

        socket.on('connect', () => {
            console.log('Socket connected');
            fetchData();
        });

        socket.on('whatsapp:status', (data) => {
            setWhatsappStatus(data.status);
            if (data.status === 'connected') {
                setQrCode(null);
                fetchData();
            }
        });

        socket.on('whatsapp:qr', (qr) => {
            setQrCode(qr);
            setWhatsappStatus('qr_ready');
        });

        socket.on('message:new', (message) => {
            // Update conversations list
            setConversations(prev => {
                const existing = prev.find(c => c.jid === message.jid);
                if (existing) {
                    return prev.map(c =>
                        c.jid === message.jid
                            ? { ...c, last_message: message.content, last_message_at: message.timestamp, unread_count: c.unread_count + 1 }
                            : c
                    ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
                }
                return [{
                    jid: message.jid,
                    name: message.pushName,
                    last_message: message.content,
                    last_message_at: message.timestamp,
                    unread_count: 1
                }, ...prev];
            });
        });

        socket.on('hotlead:detected', (data) => {
            setHotLeadsCount(prev => prev + 1);
            // Could show a notification here
        });

        return () => {
            socket.off('connect');
            socket.off('whatsapp:status');
            socket.off('whatsapp:qr');
            socket.off('message:new');
            socket.off('hotlead:detected');
        };
    }, [fetchData, isActivated]);

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Connect to WhatsApp
    const connectWhatsApp = async () => {
        try {
            setWhatsappStatus('connecting');
            await fetch('/api/whatsapp/connect', { method: 'POST' });
        } catch (error) {
            console.error('Error connecting:', error);
            setWhatsappStatus('disconnected');
        }
    };

    // Render current view
    const renderView = () => {
        // Show QR code if not connected
        if (whatsappStatus !== 'connected' && currentView === 'chat') {
            return (
                <QRCodeView
                    status={whatsappStatus}
                    qrCode={qrCode}
                    onConnect={connectWhatsApp}
                />
            );
        }

        switch (currentView) {
            case 'chat':
                return (
                    <ChatView
                        conversations={conversations}
                        selectedChat={selectedChat}
                        onSelectChat={setSelectedChat}
                        socket={socket}
                    />
                );
            case 'campaigns':
                return <CampaignsView />;
            case 'catalog':
                return <CatalogView />;
            case 'goals':
                return <GoalsView />;
            case 'hotleads':
                return <HotLeadsView onCountUpdate={setHotLeadsCount} />;
            case 'brain':
                return <BrainView />;
            case 'settings':
                return <SettingsView />;
            case 'playground':
                return <PlaygroundView />;
            default:
                return <ChatView conversations={conversations} />;
        }
    };

    const viewTitles = {
        chat: 'Conversations',
        campaigns: 'Campagnes',
        catalog: 'Catalogue Produits',
        goals: 'Objectifs Conversationnels',
        hotleads: 'Hot Leads',
        brain: 'Brain (IA)',
        playground: 'Simulateur IA (Playground)',
        settings: 'Paramètres'
    };

    // LOADING STATE
    if (isActivated === null) {
        return (
            <div className="empty-qr-state" style={{ height: '100vh', background: 'var(--bg-primary)', color: 'white' }}>
                <div className="spin-anim" style={{
                    width: '40px', height: '40px',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: 'var(--accent-primary)',
                    borderRadius: '50%'
                }}></div>
                <p style={{ marginTop: '20px', opacity: 0.6 }}>Chargement du système...</p>
            </div>
        );
    }

    // BLOCKED / ACTIVATION STATE
    if (!isActivated) {
        return <ActivationScreen onActivate={checkActivation} />;
    }

    // MAIN APP
    return (
        <div className="app-container">
            <Sidebar
                currentView={currentView}
                onNavigate={setCurrentView}
                whatsappStatus={whatsappStatus}
                hotLeadsCount={hotLeadsCount}
            />
            <main className="main-content">
                <Header
                    title={viewTitles[currentView]}
                    whatsappStatus={whatsappStatus}
                />
                <div className="page-content">
                    {renderView()}
                </div>
            </main>
        </div>
    );
}
