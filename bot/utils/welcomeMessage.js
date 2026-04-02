/**
 * Remplace les variables dans un message/embed de bienvenue ou départ
 */
function resolveVariables(text, member) {
    if (!text) return text;
    return text
        .replace(/\{user\}/g, `<@${member.id}>`)
        .replace(/\{username\}/g, member.user.username)
        .replace(/\{server\}/g, member.guild.name)
        .replace(/\{membercount\}/g, member.guild.memberCount);
}

/**
 * Construit un embed Discord à partir de la config stockée en DB
 */
function buildEmbed(embedConfig, member) {
    if (!embedConfig) return null;
    const cfg = typeof embedConfig === 'string' ? JSON.parse(embedConfig) : embedConfig;

    const embed = { type: 'rich' };

    if (cfg.color) embed.color = parseInt(cfg.color.replace('#', ''), 16);
    if (cfg.title) embed.title = resolveVariables(cfg.title, member);
    if (cfg.description) embed.description = resolveVariables(cfg.description, member);
    if (cfg.footer) embed.footer = { text: resolveVariables(cfg.footer, member) };
    if (cfg.thumbnail === 'avatar') {
        embed.thumbnail = { url: member.user.displayAvatarURL({ size: 128 }) };
    } else if (cfg.thumbnail) {
        embed.thumbnail = { url: cfg.thumbnail };
    }
    if (cfg.image) embed.image = { url: cfg.image };

    return embed;
}

module.exports = { resolveVariables, buildEmbed };
