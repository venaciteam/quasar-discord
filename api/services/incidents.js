// ═══════════════════════════════════════════════════════════════
//  Incidents — code de traçage, alerte Discord, filet global du processus
//
//  Quasar fait tourner l'API du dashboard ET le bot Discord dans le MÊME
//  processus Node. Une promesse rejetée sans gestionnaire y a donc une portée
//  disproportionnée : avant Node 15 elle produisait un avertissement, depuis
//  elle termine le processus. Autrement dit, une erreur asynchrone dans une
//  route du dashboard déconnectait le bot de TOUS les serveurs.
//
//  Express 5 couvre l'essentiel du problème : un handler async qui rejette part
//  désormais dans le gestionnaire d'erreurs, exactement comme une exception
//  synchrone. Mais deux familles de rejets lui échappent par construction :
//
//   1. Les callbacks d'EventEmitter (`req.on('end', async () => …)`) : Express
//      ne voit jamais cette promesse.
//   2. Tout le bot — événements discord.js, planificateur, minuteries — qui ne
//      passe par aucune couche Express.
//
//  D'où le filet posé ici, en dernier recours. Il journalise et laisse vivre.
//
//  ─── Ce qu'un filet silencieux coûte ───
//  Attraper un rejet sans le rendre visible remplace un plantage bruyant par
//  une dégradation invisible : le processus survit, la fonctionnalité est
//  cassée, et personne ne l'apprend avant qu'une personne le signale. C'est le
//  piège exact que ce module existe pour éviter — d'où l'alerte Discord, en
//  plus du journal. Sans destination configurée, il reste le journal, jamais
//  rien de moins.
// ═══════════════════════════════════════════════════════════════

// Alphabet sans caractères ambigus : un code se lit à voix haute ou se recopie
// depuis une capture d'écran, O/0 et I/1 y sont des pièges.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Code court identifiant un incident, affiché à la personne concernée et écrit
 * dans les journaux. « J'ai eu QSR-7F3A » suffit à retrouver la trace complète.
 * @returns {string}
 */
function newIncidentCode() {
    let out = '';
    for (let i = 0; i < 4; i++) {
        out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return `QSR-${out}`;
}

// ─── Alerte Discord ─────────────────────────────────────────────────────────

// Destination dédiée, volontairement distincte de FEEDBACK_WEBHOOK_URL : ce
// webhook-là reçoit les signalements écrits par les visiteuses et visiteurs de
// la vitrine. Mélanger « quelqu'un signale un bug » et « le bot a failli
// tomber » rendrait les deux moins lisibles, et une instance auto-hébergée peut
// très bien vouloir l'un sans l'autre. Absente : le journal suffit.
const WEBHOOK_URL = () => process.env.INCIDENT_WEBHOOK_URL;

const COLOR_INCIDENT = 0xED4245;

// Une erreur qui se répète le fait rarement une fois : une route en échec
// appelée en boucle par le dashboard, ou une minuterie qui repart toutes les
// secondes, noieraient le salon en quelques minutes — et le bruit ferait perdre
// l'alerte utile. Une même signature n'est donc annoncée qu'une fois par
// fenêtre ; les occurrences suivantes sont comptées et reportées sur l'alerte
// d'après, qui dit alors « 47 fois depuis la dernière alerte ».
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

// Borne dure sur la table de déduplication. Sans elle, des erreurs à signature
// unique (un identifiant dans le message, par exemple) la feraient croître sans
// fin — une fuite mémoire dans le code censé protéger le processus.
const DEDUPE_MAX_ENTRIES = 500;

/** @type {Map<string, { count: number, lastSent: number }>} */
const recent = new Map();

/**
 * Signature d'une erreur, pour la déduplication. Le premier cadre de la pile
 * distingue deux erreurs de même message levées à des endroits différents.
 */
function signature(error, context = {}) {
    const firstFrame = (error?.stack || '').split('\n')[1]?.trim() || '';
    return `${context.source || ''}|${error?.name || 'Error'}|${error?.message || String(error)}|${firstFrame}`;
}

/**
 * Décide si cette erreur doit être annoncée maintenant.
 * @returns {{ send: boolean, suppressed: number }}
 */
function throttle(key, now = Date.now()) {
    const entry = recent.get(key);

    if (!entry || now - entry.lastSent >= DEDUPE_WINDOW_MS) {
        const suppressed = entry ? entry.count : 0;
        recent.set(key, { count: 0, lastSent: now });

        // Purge opportuniste : les entrées dont la fenêtre est écoulée n'ont
        // plus rien à apprendre à personne.
        if (recent.size > DEDUPE_MAX_ENTRIES) {
            for (const [k, v] of recent) {
                if (now - v.lastSent >= DEDUPE_WINDOW_MS) recent.delete(k);
                if (recent.size <= DEDUPE_MAX_ENTRIES) break;
            }
        }
        return { send: true, suppressed };
    }

    entry.count += 1;
    return { send: false, suppressed: 0 };
}

/**
 * Tronque une valeur pour tenir dans un embed Discord (limites de l'API), en
 * signalant la coupe plutôt qu'en la masquant.
 */
function clamp(text, max) {
    const value = String(text ?? '');
    return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/**
 * Annonce un incident sur le webhook Discord dédié.
 *
 * Ne renvoie jamais de promesse rejetée et ne lève jamais : ce module est
 * appelé DEPUIS le gestionnaire de rejets non capturés. Un échec d'envoi qui
 * rejetterait ici relancerait le gestionnaire, qui rappellerait cette
 * fonction — une boucle que rien n'arrêterait.
 *
 * @param {Error|any} error
 * @param {{ code?: string, source?: string, details?: Record<string, string> }} context
 * @returns {Promise<void>}
 */
async function alertIncident(error, context = {}) {
    const url = WEBHOOK_URL();
    if (!url) return;

    try {
        const { send, suppressed } = throttle(signature(error, context));
        if (!send) return;

        const fields = [];
        for (const [name, value] of Object.entries(context.details || {})) {
            if (value === undefined || value === null || value === '') continue;
            fields.push({ name: clamp(name, 256), value: clamp(value, 1024), inline: true });
        }
        if (suppressed > 0) {
            fields.push({
                name: 'Occurrences masquées',
                value: `${suppressed} depuis la dernière alerte (même erreur, même origine).`,
                inline: false,
            });
        }

        const stack = error?.stack ? `\n\`\`\`\n${clamp(error.stack, 1200)}\n\`\`\`` : '';
        const embed = {
            title: `⚠️ Incident ${context.code || 'sans code'}`,
            description: clamp(
                `**${error?.name || 'Error'}** : ${error?.message || String(error)}${stack}`,
                4000,
            ),
            color: COLOR_INCIDENT,
            fields: fields.slice(0, 25),
            timestamp: new Date().toISOString(),
            footer: { text: `Quasar · ${context.source || 'origine inconnue'}` },
        };

        // Délai dur : une destination injoignable ne doit pas laisser de socket
        // ouverte, ni retarder le reste.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] }),
                signal: controller.signal,
            });
            if (!res.ok) {
                console.error(`[Quasar] Alerte d'incident refusée par le webhook (HTTP ${res.status}).`);
            }
        } finally {
            clearTimeout(timer);
        }
    } catch (err) {
        // Dernier rempart : l'échec de l'alerte se dit dans le journal et
        // s'arrête là. Il ne remonte jamais à l'appelant.
        console.error('[Quasar] Impossible d\'envoyer l\'alerte d\'incident :', err?.message || err);
    }
}

// ─── Filet global du processus ──────────────────────────────────────────────

let installed = false;

/**
 * Pose le filet `unhandledRejection`. À appeler UNE FOIS, au tout début du
 * point d'entrée, avant le chargement du bot et de l'API.
 *
 * Effet de bord à connaître : poser ce gestionnaire désactive le comportement
 * par défaut de Node pour TOUT le processus — bot compris. Un rejet non capturé
 * dans un événement discord.js ne fera donc plus tomber le processus non plus.
 * C'est l'objectif, mais ça déplace la charge de la preuve sur le journal : d'où
 * la pile complète, le préfixe repérable, et l'alerte Discord.
 *
 * `uncaughtException` n'est volontairement PAS attrapé. Un rejet de promesse
 * laisse le processus dans un état connu ; une exception non capturée, non —
 * continuer avec un état potentiellement incohérent est pire qu'un arrêt franc
 * que le superviseur (Docker, systemd) redémarre proprement.
 */
function installProcessGuard() {
    if (installed) return;
    installed = true;

    process.on('unhandledRejection', (reason) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        const code = newIncidentCode();

        // Une ligne pour l'essentiel — c'est elle qu'on cherchera avec le code —
        // puis la pile complète. Le préfixe est volontairement voyant : ce
        // message signale une erreur que PERSONNE n'a gérée.
        console.error(
            `[Quasar] ⚠️  REJET NON CAPTÉ ${code} | ` +
            `${error.name}${typeof error.code !== 'undefined' ? `[${error.code}]` : ''}: ${error.message}`,
        );
        console.error(error.stack || error);

        alertIncident(error, {
            code,
            source: 'rejet non capté',
            details: { Origine: 'process.unhandledRejection' },
        });
    });
}

module.exports = {
    newIncidentCode,
    alertIncident,
    installProcessGuard,
};
