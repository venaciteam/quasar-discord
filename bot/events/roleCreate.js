const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: 'roleCreate',
    once: false,
    async execute(role) {
        if (role.managed) return; // Rôles de bots
        const embed = new EmbedBuilder()
            .setTitle('🎭 Rôle créé')
            .setColor(0x2ecc71)
            .addFields(
                { name: 'Nom', value: role.name, inline: true },
                { name: 'Couleur', value: role.hexColor, inline: true }
            )
            .setTimestamp();
        await sendLog(role.guild, 'server_role', embed);
    }
};
