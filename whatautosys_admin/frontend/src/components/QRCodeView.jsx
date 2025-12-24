import { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, CheckCircle2, Zap, Settings, Link } from 'lucide-react';

export default function QRCodeView({ status, qrCode, onConnect }) {
    const [progress, setProgress] = useState(100);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (status === 'qr_ready' && qrCode) {
            setProgress(100);
            const duration = 45000;
            const interval = 100;
            const step = 100 / (duration / interval);

            const timer = setInterval(() => {
                setProgress(prev => Math.max(0, prev - step));
            }, interval);

            return () => clearInterval(timer);
        }
    }, [qrCode, status]);

    const handleRegenerate = () => {
        setIsRegenerating(true);
        setShowSuccess(false);
        onConnect();

        setTimeout(() => {
            setIsRegenerating(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 2000);
    };

    return (
        <div className="content-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{
                display: 'flex',
                maxWidth: '900px',
                width: '100%',
                padding: 0,
                overflow: 'hidden',
                background: 'rgba(30,30,30,0.6)'
            }}>
                {/* Left Side: QR Code */}
                <div style={{
                    width: '400px',
                    background: 'black',
                    padding: '40px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: '1px solid var(--border-color)'
                }}>
                    {status === 'qr_ready' && qrCode ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                                padding: '16px',
                                background: 'white',
                                borderRadius: '24px',
                                boxShadow: '0 0 40px rgba(249, 115, 22, 0.2)',
                                marginBottom: '24px'
                            }}>
                                <img
                                    src={qrCode}
                                    alt="QR Code"
                                    style={{ width: '220px', height: '220px', display: 'block' }}
                                />
                            </div>

                            <div style={{ width: '100%', maxWidth: '240px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa', marginBottom: '8px' }}>
                                    <span>Expiration</span>
                                    <span style={{ color: progress < 20 ? 'var(--danger)' : 'var(--warning)' }}>
                                        {Math.ceil((progress / 100) * 45)}s
                                    </span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: progress < 20 ? 'var(--danger)' : 'var(--accent-primary)',
                                        transition: 'width 0.1s linear'
                                    }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            {status === 'connecting' ? (
                                <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', margin: '0 auto 20px' }} />
                            ) : (
                                <Smartphone size={60} style={{ opacity: 0.2, marginBottom: '20px' }} />
                            )}
                            <p style={{ fontSize: '14px' }}>
                                {status === 'connecting' ? 'Génération du QR Code...' : 'En attente de connexion'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Side: Instructions */}
                <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Connexion WhatsApp</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            Synchronisez votre compte pour activer l'assistant IA.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(249, 115, 22, 0.1)',
                                color: 'var(--accent-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '14px'
                            }}>1</div>
                            <div style={{ fontSize: '14px' }}>
                                Ouvrez <strong>WhatsApp</strong> sur votre téléphone
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(249, 115, 22, 0.1)',
                                color: 'var(--accent-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '14px'
                            }}>2</div>
                            <div style={{ fontSize: '14px' }}>
                                Allez dans <strong>Réglages</strong> {'>'} <strong>Appareils liés</strong>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(249, 115, 22, 0.1)',
                                color: 'var(--accent-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '14px'
                            }}>3</div>
                            <div style={{ fontSize: '14px' }}>
                                Appuyez sur <strong>Connecter un appareil</strong> et scannez
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleRegenerate}
                        disabled={isRegenerating || status === 'connecting'}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        {isRegenerating ? (
                            <RefreshCw size={18} className="spin-anim" />
                        ) : showSuccess ? (
                            <CheckCircle2 size={18} />
                        ) : (
                            <RefreshCw size={18} />
                        )}
                        <span style={{ marginLeft: '8px' }}>
                            {isRegenerating ? 'Génération...' : showSuccess ? 'Code actualisé' : 'Rafraîchir le code'}
                        </span>
                    </button>

                    {/* Watermark */}
                    <div style={{ position: 'absolute', bottom: '20px', right: '20px', opacity: 0.05 }}>
                        <Zap size={100} />
                    </div>
                </div>
            </div>
        </div>
    );
}
