const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprimer des messages')
        .addIntegerOption(opt => opt.setName('nombre').setDescription('Nombre de messages à supprimer (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
        .addUserOption(opt => opt.setName('membre').setDescription('Supprimer uniquement les messages de ce membre').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('nombre');
        const targetUser = interaction.options.getUser('membre');

        await interaction.deferReply({ ephemeral: true });

        try {
            if (targetUser) {
                // Récupérer les messages et filtrer par utilisateur
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const userMessages = messages
                    .filter(m => m.author.id === targetUser.id)
                    .first(amount);

                if (userMessages.length === 0) {
                    return interaction.editReply({ content: `❌ Aucun message de ${targetUser} trouvé.` });
                }

                const deleted = await interaction.channel.bulkDelete(userMessages, true);
                await interaction.editReply({
                    content: `🗑️ **${deleted.size}** message(s) de ${targetUser} supprimé(s).`
                });
            } else {
                const deleted = await interaction.channel.bulkDelete(amount, true);
                await interaction.editReply({
                    content: `🗑️ **${deleted.size}** message(s) supprimé(s).`
                });
            }
        } catch (e) {
            console.error('[Atom] Clear error:', e);
            await interaction.editReply({ content: '❌ Erreur. Les messages de +14 jours ne peuvent pas être supprimés en masse.' });
        }
    }
};
