const express = require('express');
const { requireAuth, requireGuildAdmin } = require('../middleware/auth');
const { getDb } = require('../services/database');
const router = express.Router({ mergeParams: true });

router.get('/config', requireAuth, requireGuildAdmin, (req, res) => {
    const db = getDb();
    const config = db.prepare('SELECT * FROM welcome_config WHERE guild_id = ?').get(req.params.guildId);
    if (!config) return res.json({});
    let welcomeEmbed = null;
    let leaveEmbed = null;
    try { welcomeEmbed = config.welcome_embed ? JSON.parse(config.welcome_embed) : null; } catch { welcomeEmbed = null; }
    try { leaveEmbed = config.leave_embed ? JSON.parse(config.leave_embed) : null; } catch { leaveEmbed = null; }
    res.json({
        welcome_channel: config.welcome_channel,
        welcome_message: config.welcome_message,
        welcome_embed: welcomeEmbed,
        welcome_enabled: !!config.welcome_enabled,
        leave_channel: config.leave_channel,
        leave_message: config.leave_message,
        leave_embed: leaveEmbed,
        leave_enabled: !!config.leave_enabled
    });
});

router.put('/config', requireAuth, requireGuildAdmin, (req, res) => {
    const db = getDb();
    const d = req.body;
    db.prepare('INSERT OR IGNORE INTO welcome_config (guild_id) VALUES (?)').run(req.params.guildId);
    db.prepare(`UPDATE welcome_config SET
        welcome_channel = ?, welcome_message = ?, welcome_embed = ?, welcome_enabled = ?,
        leave_channel = ?, leave_message = ?, leave_embed = ?, leave_enabled = ?
        WHERE guild_id = ?
    `).run(
        d.welcome_channel || null, d.welcome_message || null,
        d.welcome_embed ? JSON.stringify(d.welcome_embed) : null, d.welcome_enabled ? 1 : 0,
        d.leave_channel || null, d.leave_message || null,
        d.leave_embed ? JSON.stringify(d.leave_embed) : null, d.leave_enabled ? 1 : 0,
        req.params.guildId
    );
    res.json({ success: true });
});

module.exports = router;
