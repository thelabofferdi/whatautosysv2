import React, { useState } from 'react';
import './index.css';

const AdminAuth = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === 'admin123') {
            onLogin();
        } else {
            setError('Mot de passe incorrect');
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100vh', color: 'white', background: '#1c1917'
        }}>
            <div className="card" style={{ width: '300px', textAlign: 'center', padding: '40px', background: '#292524', borderRadius: '12px', border: '1px solid #444' }}>
                <h2 style={{ marginBottom: '20px' }}>🛡️ Admin Panel</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ marginBottom: '20px', width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#1c1917', color: 'white' }}
                    />
                    {error && <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px' }}>{error}</p>}
                    <button type="submit" style={{ width: '100%', padding: '12px', background: '#f97316', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Entrer</button>
                </form>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generatedLicenses, setGeneratedLicenses] = useState([]);
    const [error, setError] = useState('');

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Call the separate Admin Backend
            const res = await fetch('http://localhost:3002/api/generate-licenses', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                setGeneratedLicenses(prev => [...data.licenses, ...prev]);
                setFile(null);
            } else {
                setError(data.error || "Erreur inconnue");
            }
        } catch (err) {
            setError("Impossible de contacter le serveur Admin (Port 3002). Assurez-vous qu'il est lancé.");
        } finally {
            setLoading(false);
        }
    };

    const downloadLicense = (license) => {
        // Convert base64 to blob
        const byteCharacters = atob(license.key);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });

        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = license.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', color: 'white', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>WhatAutosys - Admin</h1>
                    <p style={{ color: '#a8a29e', marginTop: '5px' }}>Générateur de Licences Sécurisées (.wlic)</p>
                </div>
                <div style={{ padding: '8px 16px', background: '#292524', borderRadius: '20px', fontSize: '12px', border: '1px solid #444' }}>
                    v1.0.0
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>

                {/* UPLOAD CARD */}
                <div style={{ background: '#292524', borderRadius: '12px', padding: '24px', border: '1px solid #444', height: 'fit-content' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📤</span> Import de clés
                    </h3>
                    <p style={{ fontSize: '13px', color: '#a8a29e', marginBottom: '24px', lineHeight: '1.5' }}>
                        Chargez un fichier <code>.txt</code> ou <code>.csv</code> contenant vos clés API Mistral.<br /><br />
                        Format attendu :<br />
                        <code>NomClient, MistralApiKey</code>
                    </p>

                    <form onSubmit={handleFileUpload}>
                        <div style={{ marginBottom: '20px', position: 'relative' }}>
                            <input
                                type="file"
                                onChange={e => setFile(e.target.files[0])}
                                accept=".txt,.csv"
                                style={{ width: '100%', fontSize: '13px' }}
                            />
                        </div>

                        {error && (
                            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#fca5a5', fontSize: '12px', marginBottom: '16px' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!file || loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: loading ? '#444' : '#f97316',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: loading ? 'wait' : 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            {loading ? 'Génération...' : 'Générer les licences'}
                        </button>
                    </form>
                </div>

                {/* RESULTS LIST */}
                <div style={{ background: '#292524', borderRadius: '12px', padding: '24px', border: '1px solid #444', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '16px' }}>📋 Licences Générées</h3>

                    {generatedLicenses.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#57534e', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ fontSize: '40px', opacity: 0.5 }}>🎫</div>
                            <p>Aucune licence générée pour cette session</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {generatedLicenses.map((lic, idx) => (
                                <div key={idx} style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid #444'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{lic.client}</div>
                                        <code style={{ fontSize: '12px', color: '#a8a29e' }}>{lic.filename}</code>
                                    </div>
                                    <button
                                        onClick={() => downloadLicense(lic)}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span>⬇️</span> Télécharger
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    return isAuthenticated ? <AdminDashboard /> : <AdminAuth onLogin={() => setIsAuthenticated(true)} />;
}

export default App;
