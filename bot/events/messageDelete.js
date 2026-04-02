const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message) {
        if (!message.guild || message.author?.bot) return;
        if (message.partial) return; // Pas assez d'infos

        const content = message.content?.slice(0, 1024) || '*contenu non disponible*';
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Message supprimé')
            .setColor(0xe74c3c)
            .addFields(
                { name: 'Auteur', value: message.author ? `${message.author} (${message.author.tag})` : 'Inconnu', inline: true },
                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Contenu', value: content }
            )
            .setTimestamp();

        if (message.attachments.size > 0) {
            embed.addFields({ name: '📎 Pièces jointes', value: message.attachments.map(a => a.name).join(', ') });
        }

        await sendLog(message.guild, 'msg_delete', embed);
    }
};
