const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../api/services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlog')
        .setDescription('Retirer le channel de logs de modération')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const db = getDb();

        const existing = db.prepare(`
            SELECT config FROM modules WHERE guild_id = ? AND module_name = 'moderation'
        `).get(interaction.guild.id);

        if (!existing) {
            return interaction.reply({ content: '❌ Aucun channel de logs configuré.', ephemeral: true });
        }

        const config = JSON.parse(existing.config || '{}');
        delete config.logChannel;

        db.prepare(`
            UPDATE modules SET config = ? WHERE guild_id = ? AND module_name = 'moderation'
        `).run(JSON.stringify(config), interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle('📝 Logs de modération')
            .setColor(0xe74c3c)
            .setDescription('Les logs de modération ont été désactivés.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
