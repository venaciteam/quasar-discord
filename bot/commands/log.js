const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDb } = require('../../api/services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('log')
        .setDescription('Définir le channel de logs de modération')
        .addChannelOption(opt => opt
            .setName('channel')
            .setDescription('Le channel de logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const db = getDb();

        // Upsert module moderation avec le logChannel
        const existing = db.prepare(`
            SELECT config FROM modules WHERE guild_id = ? AND module_name = 'moderation'
        `).get(interaction.guild.id);

        let config = {};
        if (existing) {
            config = JSON.parse(existing.config || '{}');
        }
        config.logChannel = channel.id;

        db.prepare(`
            INSERT INTO modules (guild_id, module_name, enabled, config)
            VALUES (?, 'moderation', 1, ?)
            ON CONFLICT(guild_id, module_name)
            DO UPDATE SET config = ?, enabled = 1
        `).run(interaction.guild.id, JSON.stringify(config), JSON.stringify(config));

        const embed = new EmbedBuilder()
            .setTitle('📝 Logs de modération')
            .setColor(0xc8a86e)
            .setDescription(`Les logs seront envoyés dans ${channel}.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
