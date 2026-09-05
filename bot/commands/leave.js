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
    defaultEmbedTitle: '{username} s\'en va...',
    defaultEmbedDesc: 'Il reste **{membercount}** membres. Bonne route 👋',
    defaultTestMsg: (member) => `🚪 **${member.user.username}** vient de quitter **${member.guild.name}**. Il reste ${member.guild.memberCount} membres.`
});
