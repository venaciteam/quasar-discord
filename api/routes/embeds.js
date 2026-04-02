const express = require('express');
const { requireAuth, requireGuildAdmin } = require('../middleware/auth');
const { getDb } = require('../services/database');
const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, requireGuildAdmin, (req, res) => {
    const db = getDb();
    const embeds = db.prepare('SELECT id, name, data, updated_at FROM embeds WHERE guild_id = ? ORDER BY updated_at DESC').all(req.params.guildId);
    res.json(embeds.map(e => {
        try { return { ...e, data: JSON.parse(e.data) }; }
        catch { return { ...e, data: {} }; }
    }));
});

router.post('/', requireAuth, requireGuildAdmin, (req, res) => {
    const db = getDb();
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'name et data requis' });
    const existing = db.prepare('SELECT id FROM embeds WHERE guild_id = ? AND name = ?').get(req.params.guildId, name);
    if (existing) {
        db.prepare("UPDATE embeds SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(data), existing.id);
        return res.json({ success: true, id: existing.id, updated: true });
    }
    const result = db.prepare('INSERT INTO embeds (guild_id, name, data) VALUES (?, ?, ?)').run(req.params.guildId, name, JSON.stringify(data));
    res.json({ success: true, id: result.lastInsertRowid });
});

router.delete('/:id', requireAuth, requireGuildAdmin, (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM embeds WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
    res.json({ success: true });
});

module.exports = router;
