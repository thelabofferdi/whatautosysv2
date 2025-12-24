import React, { useState, useCallback, useEffect } from 'react';

const ActivationScreen = ({ onActivate }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [hwid, setHwid] = useState('Chargement...');
    const [hwidCopied, setHwidCopied] = useState(false);

    useEffect(() => {
        // Fetch the real HWID from backend
        fetch('/api/system/hwid')
            .then(res => res.json())
            .then(data => {
                if (data.hwid) {
                    setHwid(data.hwid);
                }
            })
            .catch(() => {
                setHwid('Erreur de connexion');
            });
    }, []);

    const copyHwid = () => {
        navigator.clipboard.writeText(hwid);
        setHwidCopied(true);
        setTimeout(() => setHwidCopied(false), 2000);
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        if (!file.name.endsWith('.wlic')) {
            setError("Veuillez sélectionner un fichier .wlic valide");
            return;
        }
        setSelectedFile(file);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('licenseFile', selectedFile);

        try {
            const response = await fetch('/api/system/activate', {
                method: 'POST',
                body: formData
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
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.15) 0%, #1c1917 80%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '480px', animation: 'scaleIn 0.5s ease-out', padding: '32px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '20px',
                        background: 'var(--accent-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px auto', fontSize: '32px', boxShadow: 'var(--accent-glow)'
                    }}>
                        🔐
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'white' }}> Activation Requise </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Veuillez importer votre fichier de licence (.wlic) pour déverrouiller WhatAutosys.
                    </p>
                </div>

                <form onSubmit={handleSubmit} onDragEnter={handleDrag}>
                    <div
                        className={`input-group ${dragActive ? 'drag-active' : ''}`}
                        style={{
                            border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'}`,
                            borderRadius: '12px',
                            padding: '30px',
                            textAlign: 'center',
                            background: dragActive ? 'rgba(249, 115, 22, 0.1)' : 'rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('input-file-upload').click()}
                    >
                        <input
                            id="input-file-upload"
                            type="file"
                            accept=".wlic"
                            style={{ display: 'none' }}
                            onChange={handleChange}
                        />

                        {selectedFile ? (
                            <div>
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
                                <div style={{ fontWeight: 'bold', color: 'white' }}>{selectedFile.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {(selectedFile.size / 1024).toFixed(2)} KB
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}>📥</div>
                                <p style={{ color: 'white', fontWeight: '500' }}>
                                    Glissez votre fichier ici ou cliquez pour parcourir
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
                                    Format supporté: .wlic
                                </p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px', background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid #ef4444', borderRadius: '8px',
                            marginTop: '20px', color: '#fca5a5', fontSize: '13px'
                        }}>
                            🛑 {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-large-orange"
                        disabled={loading || !selectedFile}
                        style={{ marginTop: '24px', width: '100%' }}
                    >
                        {loading ? 'Validation en cours...' : 'Activer le Logiciel'}
                    </button>

                    <div style={{
                        marginTop: '20px',
                        padding: '12px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ID Machine (HWID) - Communiquez cet ID pour obtenir votre licence
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <code style={{
                                flex: 1,
                                fontSize: '12px',
                                color: 'white',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all',
                                userSelect: 'all'
                            }}>
                                {hwid}
                            </code>
                            <button
                                type="button"
                                onClick={copyHwid}
                                style={{
                                    background: hwidCopied ? '#22c55e' : 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    color: 'white',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {hwidCopied ? '✓ Copié' : '📋 Copier'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ActivationScreen;
