const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Vérifier si Quasar est en ligne'),
    
    async execute(interaction) {
        const latency = Date.now() - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        await interaction.reply({
            embeds: [{
                title: '🏓 Pong !',
                fields: [
                    { name: 'Latence', value: `${latency}ms`, inline: true },
                    { name: 'API Discord', value: `${apiLatency}ms`, inline: true }
                ],
                color: 0xc8a86e,
                timestamp: new Date().toISOString()
            }]
        });
    }
};
