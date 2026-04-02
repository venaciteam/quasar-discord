const { EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: 'guildMemberUpdate',
    once: false,
    async execute(oldMember, newMember) {
        if (newMember.user.bot) return;

        // Changement de pseudo
        if (oldMember.nickname !== newMember.nickname) {
            const embed = new EmbedBuilder()
                .setTitle('✏️ Changement de pseudo')
                .setColor(0x3498db)
                .setThumbnail(newMember.user.displayAvatarURL({ size: 64 }))
                .addFields(
                    { name: 'Membre', value: `${newMember} (${newMember.user.tag})`, inline: true },
                    { name: 'Avant', value: oldMember.nickname || '*aucun*', inline: true },
                    { name: 'Après', value: newMember.nickname || '*aucun*', inline: true }
                )
                .setTimestamp();
            await sendLog(newMember.guild, 'member_nick', embed);
        }

        // Changement de rôles
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

        if (addedRoles.size > 0) {
            const embed = new EmbedBuilder()
                .setTitle('🎭 Rôle(s) ajouté(s)')
                .setColor(0x2ecc71)
                .setThumbnail(newMember.user.displayAvatarURL({ size: 64 }))
                .addFields(
                    { name: 'Membre', value: `${newMember} (${newMember.user.tag})`, inline: true },
                    { name: 'Rôle(s)', value: addedRoles.map(r => `${r}`).join(', '), inline: true }
                )
                .setTimestamp();
            await sendLog(newMember.guild, 'member_roles', embed);
        }

        if (removedRoles.size > 0) {
            const embed = new EmbedBuilder()
                .setTitle('🎭 Rôle(s) retiré(s)')
                .setColor(0xe74c3c)
                .setThumbnail(newMember.user.displayAvatarURL({ size: 64 }))
                .addFields(
                    { name: 'Membre', value: `${newMember} (${newMember.user.tag})`, inline: true },
                    { name: 'Rôle(s)', value: removedRoles.map(r => `${r}`).join(', '), inline: true }
                )
                .setTimestamp();
            await sendLog(newMember.guild, 'member_roles', embed);
        }
    }
};
