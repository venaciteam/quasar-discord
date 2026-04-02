const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannir un utilisateur')
        .addStringOption(opt => opt.setName('id').setDescription('L\'ID de l\'utilisateur à débannir').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const userId = interaction.options.getString('id');

        try {
            const ban = await interaction.guild.bans.fetch(userId);
            await interaction.guild.members.unban(userId);

            const embed = new EmbedBuilder()
                .setTitle('✅ Débannissement')
                .setColor(0x2ecc71)
                .addFields(
                    { name: 'Utilisateur', value: `${ban.user.tag} (${userId})`, inline: true },
                    { name: 'Débanni par', value: `${interaction.user}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            await interaction.reply({ content: '❌ Utilisateur non trouvé dans les bans.', ephemeral: true });
        }
    }
};
