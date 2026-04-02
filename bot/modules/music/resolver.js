const ytdl = require('@distube/ytdl-core');
const play = require('play-dl');

const SONGLINK_API = 'https://song.vena.city/api/create';
const SONGLINK_BASE = 'https://song.vena.city';

/**
 * Génère un lien SongLink via song.vena.city
 * Fallback : retourne l'URL YouTube originale
 */
async function getSonglinkUrl(youtubeUrl) {
    try {
        const res = await fetch(SONGLINK_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: youtubeUrl })
        });
        if (!res.ok) return youtubeUrl;
        const data = await res.json();
        if (data.url) return `${SONGLINK_BASE}${data.url}`;
        return youtubeUrl;
    } catch {
        return youtubeUrl;
    }
}

/**
 * Résout une URL ou une recherche en track(s)
 * Supporte : YouTube URL, YouTube playlist, recherche texte, liens cross-platform (Odesli)
 */
async function resolve(input, requestedBy) {
    const isUrl = input.startsWith('http://') || input.startsWith('https://');

    if (isUrl) {
        const isYouTube = input.includes('youtube.com') || input.includes('youtu.be');

        if (!isYouTube) {
            // Convertir via Odesli → chercher sur YouTube
            const converted = await resolveViaOdesli(input);
            if (converted) {
                input = converted;
            } else {
                return { error: 'Impossible de trouver ce titre sur YouTube.' };
            }
        }

        // Playlist YouTube
        if (input.includes('list=') && !input.includes('watch?v=')) {
            try {
                const playlist = await play.playlist_info(input, { incomplete: true });
                const videos = await playlist.all_videos();
                const tracks = videos.map(v => ({
                    title: v.title || 'Titre inconnu',
                    url: v.url,
                    duration: v.durationInSec ? formatDuration(v.durationInSec) : 'Inconnue',
                    thumbnail: v.thumbnails?.[0]?.url || null,
                    requestedBy
                }));
                return { tracks, playlist: playlist.title };
            } catch (e) {
                return { error: 'Impossible de charger la playlist.' };
            }
        }

        // Vidéo YouTube simple — infos via ytdl-core
        try {
            const info = await ytdl.getBasicInfo(input);
            const details = info.videoDetails;
            const songlinkUrl = await getSonglinkUrl(details.video_url);
            return {
                tracks: [{
                    title: details.title,
                    url: details.video_url,
                    songlinkUrl,
                    duration: formatDuration(parseInt(details.lengthSeconds)),
                    thumbnail: details.thumbnails?.slice(-1)[0]?.url || null,
                    requestedBy
                }]
            };
        } catch (e) {
            return { error: 'Impossible de charger cette vidéo.' };
        }

    } else {
        // Recherche texte → YouTube via play-dl
        try {
            const results = await play.search(input, { limit: 1, source: { youtube: 'video' } });
            if (!results.length) return { error: 'Aucun résultat trouvé.' };
            const v = results[0];
            const songlinkUrl = await getSonglinkUrl(v.url);
            return {
                tracks: [{
                    title: v.title || 'Titre inconnu',
                    url: v.url,
                    songlinkUrl,
                    duration: v.durationInSec ? formatDuration(v.durationInSec) : 'Inconnue',
                    thumbnail: v.thumbnails?.[0]?.url || null,
                    requestedBy
                }]
            };
        } catch (e) {
            return { error: 'Erreur lors de la recherche.' };
        }
    }
}

async function resolveViaOdesli(url) {
    try {
        const res = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}&userCountry=FR`);
        if (!res.ok) return null;
        const data = await res.json();

        const ytMusicEntity = data.linksByPlatform?.youtubeMusic;
        const ytEntity = data.linksByPlatform?.youtube;
        const entity = ytMusicEntity || ytEntity;
        if (entity?.url) return entity.url;

        // Fallback : recherche texte
        const songEntity = data.entitiesByUniqueId?.[data.entityUniqueId];
        if (songEntity) {
            const query = `${songEntity.artistName} ${songEntity.title}`;
            const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
            return results[0]?.url || null;
        }
        return null;
    } catch {
        return null;
    }
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'Inconnue';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = { resolve, getSonglinkUrl };
