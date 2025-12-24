import { useState, useEffect } from 'react';
import { Brain, Upload, FileText, Trash2, Plus, BookOpen, CheckCircle, File } from 'lucide-react';

export default function BrainView() {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const res = await fetch('/api/brain/documents');
            const data = await res.json();
            setDocuments(data);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/brain/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                loadDocuments();
            } else {
                const error = await res.json();
                alert(error.error || 'Erreur lors de l\'upload');
            }
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Erreur lors de l\'upload');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const deleteDocument = async (id) => {
        if (!confirm('Supprimer ce document ?')) return;

        try {
            await fetch(`/api/brain/documents/${id}`, { method: 'DELETE' });
            loadDocuments();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        const colors = {
            pdf: '#ef4444',
            docx: '#3b82f6',
            doc: '#3b82f6',
            txt: '#6b7280'
        };
        return { color: colors[ext] || '#6b7280', ext: ext?.toUpperCase() || 'FILE' };
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="content-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ marginBottom: '6px', fontSize: '24px', fontWeight: 700 }}>Brain (Base de Connaissance)</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Uploadez des documents pour enrichir le contexte et l'intelligence de votre IA.
                    </p>
                </div>
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    <Upload size={18} />
                    {isUploading ? 'Upload en cours...' : 'Ajouter un document'}
                    <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                </label>
            </div>

            {/* Info Card */}
            <div className="card" style={{
                marginBottom: '24px',
                background: 'var(--accent-gradient)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                color: 'white'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Brain size={32} color="white" />
                </div>
                <div>
                    <h3 style={{ marginBottom: '6px', fontSize: '16px', fontWeight: 700 }}>Comment ça marche ?</h3>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.5', maxWidth: '700px' }}>
                        Les documents que vous ajoutez ici sont vectorisés et stockés dans la mémoire de l'IA (RAG).
                        Lorsqu'un prospect pose une question, l'IA consultera ces documents pour formuler une réponse précise et contextuelle.
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {/* Supported Formats */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[
                        { ext: 'PDF', color: '#ef4444', label: 'Documents PDF' },
                        { ext: 'DOCX', color: '#3b82f6', label: 'Word' },
                        { ext: 'TXT', color: '#a8a29e', label: 'Texte Brut' }
                    ].map(format => (
                        <div key={format.ext} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            fontSize: '12px'
                        }}>
                            <File size={14} color={format.color} />
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{format.ext}</span>
                        </div>
                    ))}
                </div>

                {/* Documents List */}
                {isLoading ? (
                    <div className="loading-overlay" style={{ position: 'relative', height: '200px' }}>
                        <div className="spinner" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="empty-state" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '300px',
                        color: 'var(--text-muted)'
                    }}>
                        <BookOpen size={60} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Aucun document</h3>
                        <p style={{ textAlign: 'center', maxWidth: '400px', marginBottom: '24px' }}>
                            Votre base de connaissance est vide. Ajoutez des fiches produits, des scripts de vente ou des FAQ pour entraîner votre IA.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {documents.map(doc => {
                            const iconInfo = getFileIcon(doc.filename);
                            return (
                                <div key={doc.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        position: 'relative'
                                    }}>
                                        <FileText size={24} color={iconInfo.color} />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-6px',
                                            background: iconInfo.color,
                                            color: 'white',
                                            fontSize: '8px',
                                            fontWeight: 700,
                                            padding: '1px 4px',
                                            borderRadius: '4px'
                                        }}>
                                            {iconInfo.ext}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.filename}>
                                            {doc.filename}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Ajouté le {formatDate(doc.created_at)}
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-ghost btn-icon"
                                        onClick={() => deleteDocument(doc.id)}
                                        title="Supprimer"
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Stats Footer */}
            {documents.length > 0 && (
                <div style={{
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{documents.length}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Documents actifs</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle size={18} />
                                Prêt
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Statut RAG</div>
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '300px', textAlign: 'right' }}>
                        Dernière indexation : {new Date().toLocaleDateString()}
                    </div>
                </div>
            )}
        </div>
    );
}
