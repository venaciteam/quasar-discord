const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../api/services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Retirer un avertissement')
        .addIntegerOption(opt => opt.setName('id').setDescription('ID de la sanction à retirer').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const sanctionId = interaction.options.getInteger('id');
        const db = getDb();

        const sanction = db.prepare(`
            SELECT * FROM sanctions WHERE id = ? AND guild_id = ? AND type = 'warn'
        `).get(sanctionId, interaction.guild.id);

        if (!sanction) {
            return interaction.reply({ content: '❌ Sanction introuvable.', ephemeral: true });
        }

        if (!sanction.active) {
            return interaction.reply({ content: '❌ Cette sanction est déjà inactive.', ephemeral: true });
        }

        db.prepare('UPDATE sanctions SET active = 0 WHERE id = ?').run(sanctionId);

        const embed = new EmbedBuilder()
            .setTitle('✅ Avertissement retiré')
            .setColor(0x2ecc71)
            .addFields(
                { name: 'Sanction', value: `#${sanctionId}`, inline: true },
                { name: 'Membre', value: `<@${sanction.user_id}>`, inline: true },
                { name: 'Retiré par', value: `${interaction.user}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
