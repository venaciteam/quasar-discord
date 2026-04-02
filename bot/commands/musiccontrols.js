const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { getQueue, deleteQueue } = require('../modules/music/queue');
const { playNext, scheduleDisconnect } = require('../modules/music/player');
const { checkMusicChannel } = require('../utils/musicChannel');

// /pause
const pause = {
    data: new SlashCommandBuilder().setName('pause').setDescription('Mettre la musique en pause'),
    async execute(interaction) {
        if (!await checkMusicChannel(interaction)) return;
        const queue = getQueue(interaction.guild.id);
        if (!queue?.player) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
        queue.player.pause();
        await interaction.reply({ content: '⏸️ Musique mise en pause.' });
    }
};

// /resume
const resume = {
    data: new SlashCommandBuilder().setName('resume').setDescription('Reprendre la musique'),
    async execute(interaction) {
        if (!await checkMusicChannel(interaction)) return;
        const queue = getQueue(interaction.guild.id);
        if (!queue?.player) return interaction.reply({ content: '❌ Aucune musique en pause.', ephemeral: true });
        queue.player.unpause();
        await interaction.reply({ content: '▶️ Lecture reprise.' });
    }
};

// /skip
const skip = {
    data: new SlashCommandBuilder().setName('skip').setDescription('Passer à la piste suivante'),
    async execute(interaction) {
        if (!await checkMusicChannel(interaction)) return;
        const queue = getQueue(interaction.guild.id);
        if (!queue?.player) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
        queue.player.stop(); // Déclenche AudioPlayerStatus.Idle → playNext
        await interaction.reply({ content: '⏭️ Piste suivante.' });
    }
};

// /stop
const stop = {
    data: new SlashCommandBuilder().setName('stop').setDescription('Arrêter la musique et vider la queue'),
    async execute(interaction) {
        if (!await checkMusicChannel(interaction)) return;
        const queue = getQueue(interaction.guild.id);
        if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
        queue.tracks = [];
        queue.current = null;
        queue.player?.stop();
        queue.connection?.destroy();
        deleteQueue(interaction.guild.id);
        await interaction.reply({ content: '⏹️ Musique arrêtée et queue vidée.' });
    }
};

// /queue
const queue = {
    data: new SlashCommandBuilder().setName('queue').setDescription('Voir la file d\'attente'),
    async execute(interaction) {
        const q = getQueue(interaction.guild.id);
        if (!q?.current && (!q?.tracks || q.tracks.length === 0)) {
            return interaction.reply({ content: '📭 La queue est vide.', ephemeral: true });
        }

        const lines = [];
        if (q.current) lines.push(`🎵 **En cours** : [${q.current.title}](${q.current.url}) (${q.current.duration})`);

        if (q.tracks.length > 0) {
            const next = q.tracks.slice(0, 10);
            lines.push('');
            lines.push(...next.map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) — ${t.duration}`));
            if (q.tracks.length > 10) lines.push(`*...et ${q.tracks.length - 10} piste(s) de plus*`);
        }

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('📋 Queue musicale')
                .setColor(0x6e8ec8)
                .setDescription(lines.join('\n'))
                .setFooter({ text: `${q.tracks.length} piste(s) en attente` })
                .setTimestamp()]
        });
    }
};

// /np (now playing)
const np = {
    data: new SlashCommandBuilder().setName('np').setDescription('Voir la piste en cours de lecture'),
    async execute(interaction) {
        const q = getQueue(interaction.guild.id);
        if (!q?.current) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🎵 En cours de lecture')
            .setDescription(`**[${q.current.title}](${q.current.url})**`)
            .setColor(0xc86e8e)
            .addFields(
                { name: 'Durée', value: q.current.duration || 'Inconnue', inline: true },
                { name: 'Demandé par', value: q.current.requestedBy, inline: true },
                { name: 'Volume', value: `${q.volume}%`, inline: true }
            )
            .setTimestamp();

        if (q.current.thumbnail) embed.setThumbnail(q.current.thumbnail);
        await interaction.reply({ embeds: [embed] });
    }
};

// /disconnect
const disconnect = {
    data: new SlashCommandBuilder().setName('disconnect').setDescription('Déconnecter Atom du salon vocal'),
    async execute(interaction) {
        const q = getQueue(interaction.guild.id);
        if (!q) return interaction.reply({ content: '❌ Atom n\'est pas dans un salon vocal.', ephemeral: true });

        q.tracks = [];
        q.player?.stop();
        q.connection?.destroy();
        deleteQueue(interaction.guild.id);

        await interaction.reply({ content: '👋 Déconnecté du salon vocal.' });
    }
};

module.exports = { pause, resume, skip, stop, queue, np, disconnect };
