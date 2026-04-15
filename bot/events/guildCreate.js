const { getDb } = require('../../api/services/database');

module.exports = {
    name: 'guildCreate',
    once: false,
    async execute(guild) {
        console.log(`[Quasar] Rejoint le serveur: ${guild.name} (${guild.id})`);
        const db = getDb();
        db.prepare('INSERT OR IGNORE INTO guilds (guild_id, name) VALUES (?, ?)')
            .run(guild.id, guild.name);
    }
};
