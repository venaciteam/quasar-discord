const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDb } = require('../../api/services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Configurer le module musique')
        .addSubcommand(sub => sub
            .setName('setchannel')
            .setDescription('Restreindre les commandes musique à un salon')
            .addChannelOption(opt => opt.setName('channel').setDescription('Le salon musique').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('removechannel')
            .setDescription('Retirer la restriction de salon (commandes partout)')
        )
        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('Voir la configuration musique actuelle')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const db = getDb();

        // Ajouter la colonne si elle n'existe pas (migration)
        try {
            db.exec(`ALTER TABLE music_config ADD COLUMN allowed_channel TEXT DEFAULT NULL`);
        } catch {} // Colonne déjà existante = ignoré

        if (sub === 'setchannel') {
            const channel = interaction.options.getChannel('channel');
            db.prepare(`INSERT INTO music_config (guild_id, allowed_channel) VALUES (?, ?)
                ON CONFLICT(guild_id) DO UPDATE SET allowed_channel = ?
            `).run(interaction.guild.id, channel.id, channel.id);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🎵 Salon musique configuré')
                    .setColor(0xc86e8e)
                    .setDescription(`Les commandes musique ne seront acceptées que dans ${channel}.`)
                    .setTimestamp()]
            });

        } else if (sub === 'removechannel') {
            db.prepare(`INSERT INTO music_config (guild_id, allowed_channel) VALUES (?, NULL)
                ON CONFLICT(guild_id) DO UPDATE SET allowed_channel = NULL
            `).run(interaction.guild.id);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🎵 Restriction retirée')
                    .setColor(0x6e8ec8)
                    .setDescription('Les commandes musique sont maintenant acceptées dans tous les salons.')
                    .setTimestamp()]
            });

        } else if (sub === 'status') {
            const config = db.prepare('SELECT allowed_channel FROM music_config WHERE guild_id = ?').get(interaction.guild.id);
            const channel = config?.allowed_channel;

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🎵 Configuration musique')
                    .setColor(0xc8a86e)
                    .setDescription(channel
                        ? `Commandes musique restreintes à <#${channel}>.`
                        : 'Commandes musique acceptées dans tous les salons.')
                    .setTimestamp()],
                ephemeral: true
            });
        }
    }
};
