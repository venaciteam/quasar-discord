const { getDb } = require('../../api/services/database');

async function sendModLog(guild, embed) {
    const db = getDb();
    const modConfig = db.prepare(`
        SELECT config FROM modules WHERE guild_id = ? AND module_name = 'moderation'
    `).get(guild.id);

    if (!modConfig) return;
    const config = JSON.parse(modConfig.config || '{}');
    if (!config.logChannel) return;

    const channel = guild.channels.cache.get(config.logChannel);
    if (channel) {
        await channel.send({ embeds: [embed] }).catch(err => {
            console.error('[Atom] Erreur envoi log:', err.message);
        });
    }
}

module.exports = { sendModLog };
