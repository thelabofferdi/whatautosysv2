import { useState, useEffect } from 'react';
import { Plus, Target, Edit, Trash2, Power, X, Flag } from 'lucide-react';

export default function GoalsView() {
    const [goals, setGoals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);

    const [form, setForm] = useState({
        name: '',
        description: '',
        priority: 'medium',
        tactics: [''],
        success_indicators: [''],
        abort_conditions: ['']
    });

    useEffect(() => {
        loadGoals();
    }, []);

    const loadGoals = async () => {
        try {
            const res = await fetch('/api/goals');
            const data = await res.json();
            setGoals(data);
        } catch (error) {
            console.error('Error loading goals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            name: '',
            description: '',
            priority: 'medium',
            tactics: [''],
            success_indicators: [''],
            abort_conditions: ['']
        });
    };

    const openEditModal = (goal) => {
        setEditingGoal(goal);
        setForm({
            name: goal.name,
            description: goal.description || '',
            priority: goal.priority,
            tactics: goal.tactics?.length ? goal.tactics : [''],
            success_indicators: goal.success_indicators?.length ? goal.success_indicators : [''],
            abort_conditions: goal.abort_conditions?.length ? goal.abort_conditions : ['']
        });
        setShowModal(true);
    };

    const saveGoal = async () => {
        const payload = {
            ...form,
            tactics: form.tactics.filter(t => t.trim()),
            success_indicators: form.success_indicators.filter(s => s.trim()),
            abort_conditions: form.abort_conditions.filter(a => a.trim())
        };

        try {
            if (editingGoal) {
                await fetch(`/api/goals/${editingGoal.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await fetch('/api/goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            setShowModal(false);
            setEditingGoal(null);
            resetForm();
            loadGoals();
        } catch (error) {
            console.error('Error saving goal:', error);
        }
    };

    const deleteGoal = async (id) => {
        if (!confirm('Supprimer cet objectif ?')) return;

        try {
            await fetch(`/api/goals/${id}`, { method: 'DELETE' });
            loadGoals();
        } catch (error) {
            console.error('Error deleting goal:', error);
        }
    };

    const toggleGoal = async (id) => {
        try {
            await fetch(`/api/goals/${id}/toggle`, { method: 'PATCH' });
            loadGoals();
        } catch (error) {
            console.error('Error toggling goal:', error);
        }
    };

    const addArrayField = (field) => {
        setForm({ ...form, [field]: [...form[field], ''] });
    };

    const updateArrayField = (field, index, value) => {
        const updated = [...form[field]];
        updated[index] = value;
        setForm({ ...form, [field]: updated });
    };

    const removeArrayField = (field, index) => {
        const updated = form[field].filter((_, i) => i !== index);
        setForm({ ...form, [field]: updated.length ? updated : [''] });
    };

    const getPriorityBadge = (priority) => {
        const config = {
            high: { color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.1)', label: 'Haute' },
            medium: { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.1)', label: 'Moyenne' },
            low: { color: 'var(--info)', bg: 'rgba(59, 130, 246, 0.1)', label: 'Basse' }
        };
        const style = config[priority] || config.medium;
        return (
            <span className="status-badge" style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}20` }}>
                <Flag size={10} fill={style.color} />
                {style.label}
            </span>
        );
    };

    return (
        <div className="content-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ marginBottom: '6px', fontSize: '24px', fontWeight: 700 }}>Objectifs Conversationnels</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Définissez les objectifs que l'IA doit atteindre dans les conversations
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setEditingGoal(null); setShowModal(true); }}>
                    <Plus size={18} />
                    Nouvel Objectif
                </button>
            </div>

            {/* Goals List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {isLoading ? (
                    <div className="loading-overlay" style={{ position: 'relative', height: '200px' }}>
                        <div className="spinner" />
                    </div>
                ) : goals.length === 0 ? (
                    <div className="empty-state" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text-muted)'
                    }}>
                        <Target size={60} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Aucun objectif</h3>
                        <p style={{ textAlign: 'center', maxWidth: '400px', marginBottom: '24px' }}>
                            Créez des objectifs pour guider l'IA vers des résultats commerciaux concrets.
                        </p>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={18} />
                            Créer un objectif
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {goals.map((goal) => (
                            <div key={goal.id} className="card" style={{
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                opacity: goal.is_active ? 1 : 0.6,
                                borderLeft: `3px solid ${goal.priority === 'high' ? 'var(--danger)' : goal.priority === 'medium' ? 'var(--warning)' : 'var(--info)'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        background: 'rgba(249, 115, 22, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Target size={20} color="var(--accent-primary)" />
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="btn btn-ghost btn-icon" onClick={() => toggleGoal(goal.id)} title={goal.is_active ? 'Désactiver' : 'Activer'}>
                                            <Power size={16} color={goal.is_active ? 'var(--success)' : 'var(--text-muted)'} />
                                        </button>
                                        <button className="btn btn-ghost btn-icon" onClick={() => openEditModal(goal)}>
                                            <Edit size={16} />
                                        </button>
                                        <button className="btn btn-ghost btn-icon" onClick={() => deleteGoal(goal.id)} style={{ color: 'var(--danger)' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '16px', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{goal.name}</h3>
                                        {getPriorityBadge(goal.priority)}
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                                        {goal.description || "Pas de description."}
                                    </p>
                                </div>

                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    marginTop: 'auto',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <div>
                                        <strong>{goal.tactics?.length || 0}</strong> Tactiques
                                    </div>
                                    <div>
                                        <strong>{goal.success_indicators?.length || 0}</strong> Indicateurs
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingGoal ? 'Modifier l\'objectif' : 'Nouvel Objectif'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="modal-content">
                            <div className="input-group">
                                <label className="input-label">Nom de l'objectif *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Ex: Obtenir un RDV"
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Description</label>
                                <textarea
                                    className="input textarea"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Description de l'objectif..."
                                    rows={2}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Priorité</label>
                                <select
                                    className="input select"
                                    value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                >
                                    <option value="high">Haute - Prioritaire</option>
                                    <option value="medium">Moyenne - Important</option>
                                    <option value="low">Basse - Secondaire</option>
                                </select>
                            </div>

                            {/* Dynamic Sections */}
                            {['tactics', 'success_indicators', 'abort_conditions'].map(field => (
                                <div key={field} className="input-group">
                                    <label className="input-label" style={{ textTransform: 'capitalize' }}>
                                        {field.replace('_', ' ')}
                                    </label>
                                    {form[field].map((val, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <input
                                                type="text"
                                                className="input"
                                                value={val}
                                                onChange={(e) => updateArrayField(field, i, e.target.value)}
                                            />
                                            <button className="btn btn-ghost btn-icon" onClick={() => removeArrayField(field, i)}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button className="btn btn-secondary" onClick={() => addArrayField(field)} style={{ width: '100%', borderRadius: '8px' }}>
                                        <Plus size={14} /> Ajouter
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                Annuler
                            </button>
                            <button className="btn btn-primary" onClick={saveGoal} disabled={!form.name}>
                                {editingGoal ? 'Enregistrer' : 'Créer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
