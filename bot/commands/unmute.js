const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à unmute').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('membre');
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });

        if (!member.communicationDisabledUntilTimestamp) {
            return interaction.reply({ content: '❌ Ce membre n\'est pas mute.', ephemeral: true });
        }

        try {
            await member.timeout(null);
        } catch (e) {
            return interaction.reply({ content: '❌ Impossible de unmute ce membre.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🔊 Unmute')
            .setColor(0x2ecc71)
            .addFields(
                { name: 'Membre', value: `${target} (${target.tag})`, inline: true },
                { name: 'Unmute par', value: `${interaction.user}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
