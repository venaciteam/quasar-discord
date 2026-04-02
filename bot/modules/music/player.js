const {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    NoSubscriberBehavior,
    StreamType
} = require('@discordjs/voice');
const { spawn, execSync } = require('child_process');
const { EmbedBuilder } = require('discord.js');
const { getQueue, deleteQueue } = require('./queue');
const { sendLog } = require('../../utils/logger');

const IDLE_TIMEOUT = 2 * 60 * 1000;

const YT_DLP_TIMEOUT = 30_000;

async function getAudioUrl(youtubeUrl) {
    return new Promise((resolve, reject) => {
        const proc = spawn('yt-dlp', [
            '-f', 'bestaudio[ext=webm]/bestaudio/best',
            '--get-url',
            '--no-playlist',
            youtubeUrl
        ]);

        let url = '';
        let err = '';
        let done = false;

        const timeout = setTimeout(() => {
            if (!done) {
                done = true;
                proc.kill('SIGTERM');
                reject(new Error('yt-dlp timeout (30s)'));
            }
        }, YT_DLP_TIMEOUT);

        proc.on('error', (e) => {
            if (!done) { done = true; clearTimeout(timeout); reject(e); }
        });
        proc.stdout.on('data', d => url += d.toString());
        proc.stderr.on('data', d => err += d.toString());
        proc.on('close', code => {
            if (done) return;
            done = true;
            clearTimeout(timeout);
            const trimmed = url.trim().split('\n')[0];
            if (code === 0 && trimmed) {
                resolve(trimmed);
            } else {
                reject(new Error(err.trim() || 'yt-dlp failed'));
            }
        });
    });
}

function createFfmpegStream(audioUrl, volume = 0.75) {
    const proc = spawn('ffmpeg', [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', audioUrl,
        '-af', `volume=${volume}`,
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    proc.on('error', (e) => console.error('[Atom Music] ffmpeg error:', e.message));

    // Cleanup : kill ffmpeg si le stream est détruit (skip, stop, etc.)
    proc.stdout.on('close', () => {
        if (!proc.killed) proc.kill('SIGTERM');
    });

    return proc.stdout;
}

async function playNext(guildId) {
    const queue = getQueue(guildId);
    if (!queue) return;

    if (queue.tracks.length === 0) {
        queue.current = null;
        scheduleDisconnect(queue);
        return;
    }

    const track = queue.tracks.shift();
    queue.current = track;

    try {
        console.log(`[Atom Music] Lecture: ${track.url}`);

        const audioUrl = await getAudioUrl(track.url);
        const stream = createFfmpegStream(audioUrl, 0.40);

        const resource = createAudioResource(stream, {
            inputType: StreamType.Raw,
        });

        queue.player.play(resource);

        const displayUrl = track.songlinkUrl || track.url;

        const embed = new EmbedBuilder()
            .setTitle('🎵 En cours de lecture')
            .setDescription(`**[${track.title}](${displayUrl})**`)
            .setColor(0xc86e8e)
            .addFields(
                { name: 'Durée', value: track.duration || 'Inconnue', inline: true },
                { name: 'Demandé par', value: track.requestedBy, inline: true }
            )
            .setTimestamp();

        if (track.thumbnail) embed.setThumbnail(track.thumbnail);
        queue.textChannel?.send({ embeds: [embed] }).catch(() => {});

        // Log musique
        const musicLog = new EmbedBuilder()
            .setTitle('🎵 Musique jouée')
            .setColor(0xc86e8e)
            .addFields(
                { name: 'Titre', value: track.title, inline: true },
                { name: 'Demandé par', value: track.requestedBy, inline: true }
            )
            .setTimestamp();
        if (queue.textChannel?.guild) sendLog(queue.textChannel.guild, 'atom_music', musicLog).catch(() => {});

    } catch (err) {
        console.error('[Atom Music] Erreur lecture:', err.message);
        queue.textChannel?.send({ content: `❌ Erreur lors de la lecture de **${track.title}**. Passage au suivant...` }).catch(() => {});
        playNext(guildId);
    }
}

function setupPlayer(queue) {
    const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    });

    player.on(AudioPlayerStatus.Idle, () => {
        playNext(queue.guildId);
    });

    player.on('error', (err) => {
        console.error('[Atom Music] Player error:', err.message);
        queue.current = null;
        playNext(queue.guildId);
    });

    queue.player = player;
    queue.connection.subscribe(player);
    return player;
}

function scheduleDisconnect(queue) {
    if (queue.idleTimeout) clearTimeout(queue.idleTimeout);
    queue.idleTimeout = setTimeout(() => {
        try { queue.connection?.destroy(); } catch {} // Connection may already be destroyed
        deleteQueue(queue.guildId);
        queue.textChannel?.send({ content: '👋 Déconnecté du vocal (inactivité).' }).catch(() => {});
    }, IDLE_TIMEOUT);
}

function clearDisconnect(queue) {
    if (queue.idleTimeout) {
        clearTimeout(queue.idleTimeout);
        queue.idleTimeout = null;
    }
}

module.exports = { playNext, setupPlayer, scheduleDisconnect, clearDisconnect };
