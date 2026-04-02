const { EmbedBuilder, ChannelType } = require('discord.js');
const { sendLog } = require('../utils/logger');
const { getDb } = require('../../api/services/database');

module.exports = {
    name: 'channelCreate',
    once: false,
    async execute(channel) {
        if (!channel.guild) return;

        // Skip les vocaux créés dans une catégorie TempVoice
        if (channel.type === ChannelType.GuildVoice && channel.parentId) {
            try {
                const db = getDb();
                const hasTrigger = db.prepare('SELECT 1 FROM tempvoice_triggers WHERE guild_id = ? AND category_id = ? AND enabled = 1')
                    .get(channel.guild.id, channel.parentId);
                if (hasTrigger) return;
            } catch (e) {
                console.error('[Atom] Erreur vérification TempVoice (channelCreate):', e.message || e);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('📝 Channel créé')
            .setColor(0x2ecc71)
            .addFields(
                { name: 'Nom', value: `#${channel.name}`, inline: true },
                { name: 'Type', value: channel.type === 0 ? 'Textuel' : channel.type === 2 ? 'Vocal' : `Type ${channel.type}`, inline: true }
            )
            .setTimestamp();
        await sendLog(channel.guild, 'server_channel', embed);
    }
};
