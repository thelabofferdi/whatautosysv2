const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');

// Get all conversation goals
router.get('/', (req, res) => {
    const db = getDb();
    const goals = db.prepare('SELECT * FROM conversation_goals ORDER BY priority DESC, created_at DESC').all();

    res.json(goals.map(g => ({
        ...g,
        tactics: JSON.parse(g.tactics || '[]'),
        success_indicators: JSON.parse(g.success_indicators || '[]'),
        abort_conditions: JSON.parse(g.abort_conditions || '[]'),
        escalation_rules: JSON.parse(g.escalation_rules || '{}')
    })));
});

// Get single goal
router.get('/:id', (req, res) => {
    const db = getDb();
    const goal = db.prepare('SELECT * FROM conversation_goals WHERE id = ?').get(req.params.id);

    if (!goal) {
        return res.status(404).json({ error: 'Objectif non trouvé' });
    }

    res.json({
        ...goal,
        tactics: JSON.parse(goal.tactics || '[]'),
        success_indicators: JSON.parse(goal.success_indicators || '[]'),
        abort_conditions: JSON.parse(goal.abort_conditions || '[]'),
        escalation_rules: JSON.parse(goal.escalation_rules || '{}')
    });
});

// Create goal
router.post('/', (req, res) => {
    const db = getDb();
    const id = uuidv4();

    const {
        name,
        description,
        priority,
        tactics,
        success_indicators,
        abort_conditions,
        escalation_rules
    } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nom requis' });
    }

    db.prepare(`
    INSERT INTO conversation_goals (
      id, name, description, priority, tactics,
      success_indicators, abort_conditions, escalation_rules
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        name,
        description || null,
        priority || 'medium',
        JSON.stringify(tactics || []),
        JSON.stringify(success_indicators || []),
        JSON.stringify(abort_conditions || []),
        JSON.stringify(escalation_rules || {})
    );

    res.status(201).json({ id, message: 'Objectif créé' });
});

// Update goal
router.put('/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM conversation_goals WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: 'Objectif non trouvé' });
    }

    const {
        name,
        description,
        priority,
        tactics,
        success_indicators,
        abort_conditions,
        escalation_rules,
        is_active
    } = req.body;

    db.prepare(`
    UPDATE conversation_goals SET
      name = ?,
      description = ?,
      priority = ?,
      tactics = ?,
      success_indicators = ?,
      abort_conditions = ?,
      escalation_rules = ?,
      is_active = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
        name ?? existing.name,
        description ?? existing.description,
        priority ?? existing.priority,
        tactics ? JSON.stringify(tactics) : existing.tactics,
        success_indicators ? JSON.stringify(success_indicators) : existing.success_indicators,
        abort_conditions ? JSON.stringify(abort_conditions) : existing.abort_conditions,
        escalation_rules ? JSON.stringify(escalation_rules) : existing.escalation_rules,
        is_active ?? existing.is_active,
        id
    );

    res.json({ message: 'Objectif mis à jour' });
});

// Delete goal
router.delete('/:id', (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM conversation_goals WHERE id = ?').run(req.params.id);
    res.json({ message: 'Objectif supprimé' });
});

// Get goal analytics
router.get('/:id/analytics', (req, res) => {
    const db = getDb();
    const { id } = req.params;

    // Get conversations that targeted this goal (simplified analytics)
    const goal = db.prepare('SELECT * FROM conversation_goals WHERE id = ?').get(id);

    if (!goal) {
        return res.status(404).json({ error: 'Objectif non trouvé' });
    }

    // In a real implementation, you would track goal-specific metrics
    // For now, return placeholder analytics
    res.json({
        goal: {
            id: goal.id,
            name: goal.name
        },
        metrics: {
            conversations_started: 0,
            goal_achieved: 0,
            goal_aborted: 0,
            avg_messages_to_goal: 0,
            success_rate: 0
        },
        period: '30 days'
    });
});

// Toggle goal active status
router.patch('/:id/toggle', (req, res) => {
    const db = getDb();
    const { id } = req.params;

    const goal = db.prepare('SELECT is_active FROM conversation_goals WHERE id = ?').get(id);
    if (!goal) {
        return res.status(404).json({ error: 'Objectif non trouvé' });
    }

    const newStatus = goal.is_active ? 0 : 1;
    db.prepare('UPDATE conversation_goals SET is_active = ?, updated_at = datetime("now") WHERE id = ?')
        .run(newStatus, id);

    res.json({ is_active: newStatus === 1 });
});

// Reorder goals (update priorities)
router.post('/reorder', (req, res) => {
    const db = getDb();
    const { order } = req.body; // Array of { id, priority }

    if (!Array.isArray(order)) {
        return res.status(400).json({ error: 'Format invalide' });
    }

    const updateStmt = db.prepare('UPDATE conversation_goals SET priority = ? WHERE id = ?');

    for (const item of order) {
        updateStmt.run(item.priority, item.id);
    }

    res.json({ message: 'Ordre mis à jour' });
});

module.exports = router;
