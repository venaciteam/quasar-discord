const { getDb } = require('../../api/services/database');

module.exports = {
    name: 'messageReactionAdd',
    once: false,
    async execute(reaction, user) {
        if (user.bot) return;

        // Fetch partiel si nécessaire
        if (reaction.partial) {
            try { await reaction.fetch(); } catch { return; }
        }

        const db = getDb();
        const panel = db.prepare('SELECT * FROM reaction_panels WHERE message_id = ?').get(reaction.message.id);
        if (!panel) return;

        const emoji = reaction.emoji.id
            ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>`
            : reaction.emoji.name;

        const entry = db.prepare('SELECT * FROM reaction_roles WHERE panel_id = ? AND emoji = ?').get(panel.id, emoji);
        if (!entry) return;

        const guild = reaction.message.guild;
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        // Retirer immédiatement la réaction de l'utilisateur (garder le panel propre)
        try {
            await reaction.users.remove(user.id);
        } catch {} // May lack MANAGE_MESSAGES permission

        try {
            const hasRole = member.roles.cache.has(entry.role_id);

            if (hasRole) {
                // Retirer le rôle
                await member.roles.remove(entry.role_id);

                // Confirmation temporaire
                const msg = await reaction.message.channel.send({
                    content: `${emoji} <@${user.id}> — rôle **retiré** ✅`
                }).catch(() => null);
                if (msg) setTimeout(() => msg.delete().catch(() => {}), 4000);

            } else {
                // Mode unique : retirer les autres rôles du panel d'abord
                if (panel.mode === 'unique') {
                    const allEntries = db.prepare('SELECT role_id FROM reaction_roles WHERE panel_id = ?').all(panel.id);
                    for (const e of allEntries) {
                        if (e.role_id !== entry.role_id && member.roles.cache.has(e.role_id)) {
                            await member.roles.remove(e.role_id).catch(() => {});
                        }
                    }
                }

                // Donner le rôle
                await member.roles.add(entry.role_id);

                // Confirmation temporaire
                const msg = await reaction.message.channel.send({
                    content: `${emoji} <@${user.id}> — rôle **ajouté** ✅`
                }).catch(() => null);
                if (msg) setTimeout(() => msg.delete().catch(() => {}), 4000);
            }
        } catch (e) {
            console.error('[Atom] Erreur toggle rôle réaction:', e.message);
        }
    }
};
