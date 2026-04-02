const { createConfigCommand } = require('../utils/configCommand');

module.exports = createConfigCommand({
    name: 'leave',
    description: 'Configurer les messages de départ',
    emoji: '🚪',
    color: 0x6e8ec8,
    defaultColor: '#6e8ec8',
    channelCol: 'leave_channel',
    messageCol: 'leave_message',
    embedCol: 'leave_embed',
    enabledCol: 'leave_enabled',
    defaultEmbedTitle: '{username} nous a quitté...',
    defaultEmbedDesc: 'On était {membercount} avec toi. Bonne route 👋',
    defaultTestMsg: (member) => `🚪 **${member.user.username}** vient de quitter **${member.guild.name}**. Il reste ${member.guild.memberCount} membres.`
});
