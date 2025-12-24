import React, { useState } from 'react';

const ActivationScreen = ({ onActivate }) => {
    const [licenseKey, setLicenseKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:3001/api/system/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseKey })
            });

            const data = await response.json();

            if (data.success) {
                onActivate();
            } else {
                setError(data.error || 'Activation échouée');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.15) 0%, #1c1917 80%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '480px', animation: 'scaleIn 0.5s ease-out' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '20px',
                        background: 'var(--accent-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px auto',
                        fontSize: '32px',
                        boxShadow: 'var(--accent-glow)'
                    }}>
                        🔐
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'white' }}> Activation Requise </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Veuillez entrer votre clé de licence pour déverrouiller WhatAutosys.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Clé de Licence (Configuration)</label>
                        <textarea
                            className="input"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            placeholder="eyJ..."
                            style={{
                                minHeight: '120px',
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                resize: 'none'
                            }}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            color: '#fca5a5',
                            fontSize: '13px'
                        }}>
                            🛑 {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-large-orange"
                        disabled={loading || !licenseKey}
                        style={{ position: 'relative' }}
                    >
                        {loading ? 'Validation en cours...' : 'Activer le Logiciel'}
                    </button>

                    <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                        ID Machine: {navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ActivationScreen;
