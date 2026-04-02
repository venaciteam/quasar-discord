const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: 'roleDelete',
    once: false,
    async execute(role) {
        const embed = new EmbedBuilder()
            .setTitle('🎭 Rôle supprimé')
            .setColor(0xe74c3c)
            .addFields(
                { name: 'Nom', value: role.name, inline: true },
                { name: 'Couleur', value: role.hexColor, inline: true }
            )
            .setTimestamp();
        await sendLog(role.guild, 'server_role', embed);
    }
};
