const express = require('express');
const { requireAuth, requireGuildAdmin } = require('../middleware/auth');
const { getDb } = require('../services/database');
const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, requireGuildAdmin, (req, res) => {
    const db = getDb();
    const cmds = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?').all(req.params.guildId);
    // Ajouter le nom de l'embed si lié
    const result = cmds.map(c => {
        if (c.embed_id) {
            const embed = db.prepare('SELECT name FROM embeds WHERE id = ?').get(c.embed_id);
            c.embed_name = embed?.name || null;
        }
        return c;
    });
    res.json(result);
});

// Créer une commande custom
router.post('/', requireAuth, requireGuildAdmin, async (req, res) => {
    const db = getDb();
    const { name, response, embed_name } = req.body;
    const cmdName = name?.toLowerCase().replace(/\s+/g, '-');

    if (!cmdName) return res.status(400).json({ error: 'Nom requis' });
    if (!response && !embed_name) return res.status(400).json({ error: 'Réponse ou embed requis' });

    const existing = db.prepare('SELECT name FROM custom_commands WHERE guild_id = ? AND name = ?').get(req.params.guildId, cmdName);
    if (existing) return res.status(400).json({ error: `La commande /${cmdName} existe déjà` });

    let embed_id = null;
    if (embed_name) {
        const embed = db.prepare('SELECT id FROM embeds WHERE guild_id = ? AND name = ?').get(req.params.guildId, embed_name);
        if (!embed) return res.status(400).json({ error: `Embed "${embed_name}" introuvable` });
        embed_id = embed.id;
    }

    db.prepare('INSERT INTO custom_commands (guild_id, name, response, embed_id) VALUES (?, ?, ?, ?)')
        .run(req.params.guildId, cmdName, response || null, embed_id);

    // Déployer la commande slash sur Discord
    try {
        const { REST, Routes } = require('discord.js');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.post(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, req.params.guildId), {
            body: { name: cmdName, description: (response || `Commande ${cmdName}`).substring(0, 100), type: 1 }
        });
    } catch (e) {
        console.error('[Quasar] Erreur deploy cmd custom:', e.message);
    }

    res.json({ success: true });
});

// Modifier une commande custom
router.put('/:name', requireAuth, requireGuildAdmin, (req, res) => {
    const db = getDb();
    const { response, embed_name } = req.body;

    let embed_id = null;
    if (embed_name) {
        const embed = db.prepare('SELECT id FROM embeds WHERE guild_id = ? AND name = ?').get(req.params.guildId, embed_name);
        if (!embed) return res.status(400).json({ error: `Embed "${embed_name}" introuvable` });
        embed_id = embed.id;
    }

    const result = db.prepare('UPDATE custom_commands SET response = ?, embed_id = ? WHERE guild_id = ? AND name = ?')
        .run(response || null, embed_id, req.params.guildId, req.params.name);

    if (result.changes === 0) return res.status(404).json({ error: 'Commande introuvable' });
    res.json({ success: true });
});

// Supprimer une commande custom
router.delete('/:name', requireAuth, requireGuildAdmin, async (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM custom_commands WHERE guild_id = ? AND name = ?').run(req.params.guildId, req.params.name);

    // Retirer la commande slash de Discord
    try {
        const { REST, Routes } = require('discord.js');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const cmds = await rest.get(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, req.params.guildId));
        const cmd = cmds.find(c => c.name === req.params.name);
        if (cmd) {
            await rest.delete(Routes.applicationGuildCommand(process.env.DISCORD_CLIENT_ID, req.params.guildId, cmd.id));
        }
    } catch (e) {
        console.error('[Quasar] Erreur suppression cmd Discord:', e.message);
    }

    res.json({ success: true });
});

module.exports = router;
