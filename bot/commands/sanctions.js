const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../api/services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sanctions')
        .setDescription('Voir l\'historique complet des sanctions d\'un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à vérifier').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('membre');
        const db = getDb();

        const sanctions = db.prepare(`
            SELECT id, type, moderator_id, reason, duration, created_at, active
            FROM sanctions
            WHERE guild_id = ? AND user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        `).all(interaction.guild.id, target.id);

        if (sanctions.length === 0) {
            return interaction.reply({ content: `✅ ${target} n'a aucune sanction.`, ephemeral: true });
        }

        const icons = { warn: '⚠️', mute: '🔇', kick: '🔴', ban: '🔨' };
        const lines = sanctions.map(s => {
            const icon = icons[s.type] || '📋';
            const status = s.active ? '' : ' *(retiré)*';
            const date = new Date(s.created_at + 'Z').toLocaleDateString('fr-FR');
            const duration = s.duration ? ` (${s.duration})` : '';
            return `${icon} **#${s.id}** ${s.type}${duration} — ${s.reason} (par <@${s.moderator_id}> le ${date})${status}`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`📋 Sanctions de ${target.tag}`)
            .setColor(0xc8a86e)
            .setDescription(lines.join('\n'))
            .setFooter({ text: `${sanctions.length} sanction(s) affichée(s)` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
