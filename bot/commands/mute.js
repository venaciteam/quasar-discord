const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../api/services/database');
const { sendModLog } = require('../utils/modlog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute (timeout) un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à mute').setRequired(true))
        .addStringOption(opt => opt.setName('durée').setDescription('Durée (ex: 10m, 1h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('raison').setDescription('Raison du mute').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('membre');
        const durationStr = interaction.options.getString('durée');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
        if (target.bot) return interaction.reply({ content: '❌ Tu ne peux pas mute un bot.', ephemeral: true });

        // Parser la durée
        const ms = parseDuration(durationStr);
        if (!ms || ms > 28 * 24 * 60 * 60 * 1000) {
            return interaction.reply({ content: '❌ Durée invalide. Max 28 jours. Ex: `10m`, `2h`, `1d`', ephemeral: true });
        }

        try {
            await member.timeout(ms, reason);
        } catch (e) {
            return interaction.reply({ content: '❌ Impossible de mute ce membre (permissions).', ephemeral: true });
        }

        // Enregistrer en DB
        const db = getDb();
        db.prepare(`
            INSERT INTO sanctions (guild_id, user_id, moderator_id, type, reason, duration)
            VALUES (?, ?, ?, 'mute', ?, ?)
        `).run(interaction.guild.id, target.id, interaction.user.id, reason, durationStr);

        const embed = new EmbedBuilder()
            .setTitle('🔇 Mute')
            .setColor(0xe67e22)
            .addFields(
                { name: 'Membre', value: `${target} (${target.tag})`, inline: true },
                { name: 'Modérateur', value: `${interaction.user}`, inline: true },
                { name: 'Durée', value: durationStr, inline: true },
                { name: 'Raison', value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction.guild, embed);
    }
};

function parseDuration(str) {
    const match = str.match(/^(\d+)(m|h|d|j)$/i);
    if (!match) return null;
    const val = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
        case 'm': return val * 60 * 1000;
        case 'h': return val * 60 * 60 * 1000;
        case 'd': case 'j': return val * 24 * 60 * 60 * 1000;
        default: return null;
    }
}
