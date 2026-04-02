const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../api/services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Gérer les rôles attribués automatiquement à l\'arrivée')
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Ajouter un rôle automatique')
            .addRoleOption(opt => opt.setName('role').setDescription('Le rôle à attribuer').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Retirer un rôle automatique')
            .addRoleOption(opt => opt.setName('role').setDescription('Le rôle à retirer').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('Voir les rôles automatiques configurés')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const db = getDb();

        if (sub === 'add') {
            const role = interaction.options.getRole('role');

            if (role.managed) {
                return interaction.reply({ content: '❌ Ce rôle est géré par une intégration externe.', ephemeral: true });
            }

            db.prepare('INSERT OR IGNORE INTO autoroles (guild_id, role_id) VALUES (?, ?)')
                .run(interaction.guild.id, role.id);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Autorole ajouté')
                    .setColor(0xc86e8e)
                    .setDescription(`${role} sera attribué automatiquement à chaque nouveau membre.`)
                    .setTimestamp()]
            });

        } else if (sub === 'remove') {
            const role = interaction.options.getRole('role');
            const result = db.prepare('DELETE FROM autoroles WHERE guild_id = ? AND role_id = ?')
                .run(interaction.guild.id, role.id);

            if (result.changes === 0) {
                return interaction.reply({ content: '❌ Ce rôle n\'est pas dans les autoroles.', ephemeral: true });
            }

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🗑️ Autorole retiré')
                    .setColor(0xe74c3c)
                    .setDescription(`${role} ne sera plus attribué automatiquement.`)
                    .setTimestamp()]
            });

        } else if (sub === 'list') {
            const roles = db.prepare('SELECT role_id FROM autoroles WHERE guild_id = ?').all(interaction.guild.id);

            if (roles.length === 0) {
                return interaction.reply({ content: 'Aucun autorole configuré.', ephemeral: true });
            }

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🎭 Autoroles')
                    .setColor(0x6e8ec8)
                    .setDescription(roles.map(r => `<@&${r.role_id}>`).join('\n'))
                    .setTimestamp()]
            });
        }
    }
};
