const { createConfigCommand } = require('../utils/configCommand');

module.exports = createConfigCommand({
    name: 'welcome',
    description: 'Configurer les messages de bienvenue',
    emoji: '👋',
    color: 0xc86e8e,
    defaultColor: '#c86e8e',
    channelCol: 'welcome_channel',
    messageCol: 'welcome_message',
    embedCol: 'welcome_embed',
    enabledCol: 'welcome_enabled',
    defaultEmbedTitle: 'Bienvenue sur {server} !',
    defaultEmbedDesc: 'Bienvenue {user} ! Tu es le membre numéro **{membercount}**.',
    defaultTestMsg: (member) => `👋 Bienvenue ${member} sur **${member.guild.name}** !`
});
