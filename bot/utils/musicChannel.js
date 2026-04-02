const { getDb } = require('../../api/services/database');

/**
 * Vérifie si la commande musique est autorisée dans ce channel.
 * Retourne true si OK, false sinon (et répond à l'interaction).
 */
async function checkMusicChannel(interaction) {
    const db = getDb();

    try {
        db.exec(`ALTER TABLE music_config ADD COLUMN allowed_channel TEXT DEFAULT NULL`);
    } catch {} // Colonne déjà existante = ignoré

    try {
        const config = db.prepare('SELECT allowed_channel FROM music_config WHERE guild_id = ?').get(interaction.guild.id);
        if (!config?.allowed_channel) return true; // Pas de restriction

        if (interaction.channel.id !== config.allowed_channel) {
            await interaction.reply({
                content: `❌ Les commandes musique sont réservées au salon <#${config.allowed_channel}>.`,
                ephemeral: true
            });
            return false;
        }
    } catch {
        // Table pas encore créée = pas de restriction
    }

    return true;
}

module.exports = { checkMusicChannel };
