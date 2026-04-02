const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../api/services/database');
const { sendModLog } = require('../utils/modlog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulser un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à expulser').setRequired(true))
        .addStringOption(opt => opt.setName('raison').setDescription('Raison du kick').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
        if (!member.kickable) return interaction.reply({ content: '❌ Impossible d\'expulser ce membre (permissions).', ephemeral: true });

        try {
            await member.kick(reason);
        } catch (e) {
            return interaction.reply({ content: '❌ Erreur lors de l\'expulsion.', ephemeral: true });
        }

        const db = getDb();
        db.prepare(`
            INSERT INTO sanctions (guild_id, user_id, moderator_id, type, reason)
            VALUES (?, ?, ?, 'kick', ?)
        `).run(interaction.guild.id, target.id, interaction.user.id, reason);

        const embed = new EmbedBuilder()
            .setTitle('🔴 Expulsion')
            .setColor(0xe74c3c)
            .addFields(
                { name: 'Membre', value: `${target} (${target.tag})`, inline: true },
                { name: 'Modérateur', value: `${interaction.user}`, inline: true },
                { name: 'Raison', value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction.guild, embed);
    }
};
