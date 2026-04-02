const { EmbedBuilder } = require('discord.js');
const { getDb } = require('../../api/services/database');
const { resolveVariables, buildEmbed } = require('../utils/welcomeMessage');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
        const db = getDb();
        const config = db.prepare('SELECT * FROM welcome_config WHERE guild_id = ?').get(member.guild.id);

        if (!config || !config.welcome_enabled || !config.welcome_channel) return;

        const channel = member.guild.channels.cache.get(config.welcome_channel);
        if (!channel) return;

        const embed = buildEmbed(config.welcome_embed, member);
        const content = config.welcome_message ? resolveVariables(config.welcome_message, member) : null;

        try {
            if (embed) {
                await channel.send({ content: content || undefined, embeds: [embed] });
            } else if (content) {
                await channel.send({ content });
            }
        } catch (e) {
            console.error('[Atom] Erreur message welcome:', e.message);
        }

        // Log membre rejoint
        const logEmbed = new EmbedBuilder()
            .setTitle('📥 Membre rejoint')
            .setColor(0x2ecc71)
            .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
            .addFields(
                { name: 'Membre', value: `${member} (${member.user.tag})`, inline: true },
                { name: 'Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Membres', value: `${member.guild.memberCount}`, inline: true }
            )
            .setTimestamp();
        await sendLog(member.guild, 'member_join', logEmbed);

        // Autoroles
        const autoroles = db.prepare('SELECT role_id FROM autoroles WHERE guild_id = ?').all(member.guild.id);
        for (const ar of autoroles) {
            try {
                await member.roles.add(ar.role_id);
            } catch (e) {
                console.error('[Atom] Erreur autorole:', e.message);
            }
        }
    }
};
