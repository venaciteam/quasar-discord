/**
 * Gestionnaire de queue musicale par guild
 */

const queues = new Map();

function getQueue(guildId) {
    return queues.get(guildId) || null;
}

function createQueue(guildId, voiceChannel, textChannel) {
    const queue = {
        guildId,
        voiceChannel,
        textChannel,
        tracks: [],
        current: null,
        volume: 50,
        connection: null,
        player: null,
        idleTimeout: null
    };
    queues.set(guildId, queue);
    return queue;
}

function deleteQueue(guildId) {
    queues.delete(guildId);
}

module.exports = { getQueue, createQueue, deleteQueue };
