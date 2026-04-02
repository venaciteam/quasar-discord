const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../api/services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Voir les avertissements d\'un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à vérifier').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('membre');
        const db = getDb();

        const warns = db.prepare(`
            SELECT id, moderator_id, reason, created_at, active
            FROM sanctions
            WHERE guild_id = ? AND user_id = ? AND type = 'warn'
            ORDER BY created_at DESC
        `).all(interaction.guild.id, target.id);

        if (warns.length === 0) {
            return interaction.reply({ content: `✅ ${target} n'a aucun avertissement.`, ephemeral: true });
        }

        const activeWarns = warns.filter(w => w.active);
        const lines = warns.slice(0, 15).map(w => {
            const status = w.active ? '🟡' : '⚪';
            const date = new Date(w.created_at + 'Z').toLocaleDateString('fr-FR');
            return `${status} **#${w.id}** — ${w.reason} (par <@${w.moderator_id}> le ${date})`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`📋 Avertissements de ${target.tag}`)
            .setColor(0xf1c40f)
            .setDescription(lines.join('\n'))
            .setFooter({ text: `${activeWarns.length} actif(s) / ${warns.length} total` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
