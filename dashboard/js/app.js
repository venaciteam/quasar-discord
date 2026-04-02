// ═══════════════════════════════════
//          Atom Dashboard App
// ═══════════════════════════════════

// Récupérer et stocker le token depuis l'URL si présent
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) {
    localStorage.setItem('atom_token', urlToken);
    // Nettoyer l'URL
    window.history.replaceState({}, '', '/dashboard/app.html');
}

const getToken = () => localStorage.getItem('atom_token');

const API = {
    async get(url) {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
        if (res.status === 401) { localStorage.removeItem('atom_token'); window.location.href = '/'; return null; }
        return res.json();
    },
    async put(url, data) {
        const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) });
        return res.json();
    },
    async post(url, data) {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) });
        return res.json();
    },
    async delete(url) {
        const res = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
        return res.json();
    }
};

// Toast notifications
function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position:fixed;bottom:2rem;right:2rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const color = type === 'error' ? 'var(--accent-red)' : type === 'info' ? 'var(--primary-blue)' : 'var(--accent-green)';
    toast.style.cssText = `padding:.75rem 1.25rem;background:var(--bg-secondary);border:1px solid ${color};border-radius:var(--radius-sm);color:var(--text-primary);font-size:.875rem;box-shadow:var(--shadow);opacity:0;transition:opacity .3s ease;max-width:320px`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// State
let currentUser = null;
let currentGuild = null;
let guilds = [];

// ═══ Init ═══
async function init() {
    if (!getToken()) { window.location.href = '/'; return; }
    const auth = await API.get('/auth/me');
    if (!auth?.authenticated) { localStorage.removeItem('atom_token'); window.location.href = '/'; return; }

    currentUser = auth.user;
    renderUserInfo();

    guilds = await API.get('/api/guilds') || [];
    if (guilds.length === 0) {
        showNoGuilds();
        return;
    }

    selectGuild(guilds[0]);
}

function renderUserInfo() {
    const avatarUrl = currentUser.avatar
        ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;
    document.getElementById('user-avatar').src = avatarUrl;
    document.getElementById('user-name').textContent = currentUser.username;
}

function selectGuild(guild) {
    currentGuild = guild;
    const guildIcon = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=48` : null;
    const guildEl = document.getElementById('guild-info');
    if (guildIcon) {
        guildEl.innerHTML = `<img src="${guildIcon}" alt="">`;
        guildEl.appendChild(document.createTextNode(` ${guild.name}`));
    } else {
        guildEl.textContent = `🔹 ${guild.name}`;
    }
    loadPage('overview');
}

function showNoGuilds() {
    document.getElementById('content').innerHTML = `
        <div class="main-header">
            <h1 class="main-title">Aucun serveur</h1>
            <p class="main-subtitle">Atom n'est sur aucun serveur où tu es administrateur.</p>
        </div>
    `;
}

// ═══ Navigation ═══
function getMobileBackHtml() {
    return `<button class="mobile-back" onclick="loadPage('overview')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Retour
    </button>`;
}

async function loadPage(page) {
    document.querySelectorAll('.sidebar-link').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });

    const content = document.getElementById('content');

    // Loading state
    if (page !== 'overview' && page !== 'music') {
        content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:4rem;color:var(--text-muted)">
            <div style="text-align:center">
                <div style="width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--primary-rose);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 1rem"></div>
                Chargement...
            </div>
        </div>`;
    }

    switch (page) {
        case 'overview':   await loadOverview(content); break;
        case 'moderation': await loadModeration(content, currentGuild.id); content.insertAdjacentHTML('afterbegin', getMobileBackHtml()); break;
        case 'welcome':    await loadWelcome(content, currentGuild.id); content.insertAdjacentHTML('afterbegin', getMobileBackHtml()); break;
        case 'reactionroles': await loadReactionRoles(content, currentGuild.id); content.insertAdjacentHTML('afterbegin', getMobileBackHtml()); break;
        case 'embeds':     await loadEmbeds(content, currentGuild.id); content.insertAdjacentHTML('afterbegin', getMobileBackHtml()); break;
        case 'customcmds': await loadCustomCmds(content, currentGuild.id); content.insertAdjacentHTML('afterbegin', getMobileBackHtml()); break;
        case 'tempvoice':  await loadTempVoice(content, currentGuild.id); content.insertAdjacentHTML('afterbegin', getMobileBackHtml()); break;
        case 'tickets':    await loadTickets(content, currentGuild.id); content.insertAdjacentHTML('afterbegin', getMobileBackHtml()); break;
        case 'music':      loadMusic(content); content.insertAdjacentHTML('afterbegin', getMobileBackHtml()); break;
        default:
            content.innerHTML = `<div class="main-header"><h1 class="main-title">${page}</h1><p class="main-subtitle">Module en construction 🔧</p></div>`;
    }
}

async function loadOverview(container) {
    const modules = await API.get(`/api/guilds/${currentGuild.id}/modules`) || {};

    const moduleList = [
        { key: 'moderation', icon: '🛡️', name: 'Modération', desc: 'Warn, mute, kick, ban, logs automatiques', page: 'moderation' },
        { key: 'welcome', icon: '👋', name: 'Welcome / Leave', desc: 'Messages de bienvenue et départ personnalisés', page: 'welcome' },
        { key: 'reactionroles', icon: '🎭', name: 'Reaction Roles', desc: 'Rôles automatiques via réactions emoji', page: 'reactionroles' },
        { key: 'embeds', icon: '📝', name: 'Embeds Custom', desc: 'Constructeur d\'embeds avec preview live', page: 'embeds' },
        { key: 'customcmds', icon: '⚡', name: 'Commandes Custom', desc: 'Commandes personnalisées avec texte ou embed', page: 'customcmds' },
        { key: 'tempvoice', icon: '🎧', name: 'Vocaux Temp.', desc: 'Salons vocaux créés automatiquement, supprimés quand vides', page: 'tempvoice' },
        { key: 'tickets', icon: '🎫', name: 'Tickets', desc: 'Système de support avec channels privés et transcripts', page: 'tickets' },
        { key: 'music', icon: '🎵', name: 'Musique', desc: 'Lecture depuis n\'importe quelle plateforme', page: 'music' }
    ];

    container.innerHTML = `
        <div class="main-header">
            <h1 class="main-title">Vue d'ensemble ✨</h1>
            <p class="main-subtitle">Gère les modules d'Atom sur ${currentGuild.name}</p>
        </div>
        <div class="modules-grid">
            ${moduleList.map((m, i) => {
                const mod = modules[m.key];
                const enabled = mod?.enabled ?? false;
                return `
                    <div class="module-card" onclick="loadPage('${m.page}')">
                        <div class="module-card-header">
                            <div style="display:flex;align-items:center;gap:.5rem">
                                <span class="module-card-icon">${m.icon}</span>
                                <span class="module-card-title">${m.name}</span>
                            </div>
                            <span class="badge ${enabled ? 'badge-active' : 'badge-inactive'}">${enabled ? 'Actif' : 'Inactif'}</span>
                        </div>
                        <div class="module-card-desc">${m.desc}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function loadMusic(container) {
    container.innerHTML = `
        <div class="main-header">
            <h1 class="main-title">🎵 Musique</h1>
            <p class="main-subtitle">Contrôlé directement via les commandes Discord</p>
        </div>
        <div class="card">
            <div class="card-title">Commandes disponibles</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
                ${[
                    ['/play [lien ou recherche]', 'Jouer une musique'],
                    ['/pause', 'Mettre en pause'],
                    ['/resume', 'Reprendre'],
                    ['/skip', 'Passer à la suivante'],
                    ['/stop', 'Arrêter et vider la queue'],
                    ['/queue', 'Voir la file d\'attente'],
                    ['/np', 'Piste en cours'],
                    ['/disconnect', 'Déconnecter le bot']
                ].map(([cmd, desc]) => `
                    <div style="padding:.6rem .9rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm)">
                        <code style="color:var(--primary-rose);font-size:.85rem">${cmd}</code>
                        <p style="color:var(--text-secondary);font-size:.8rem;margin-top:.2rem">${desc}</p>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="card">
            <p style="color:var(--text-secondary);font-size:.85rem">💡 La musique supporte YouTube, Spotify, Apple Music, Deezer et tout lien compatible Odesli.</p>
        </div>
    `;
}

// ═══ Event Listeners ═══
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-link[data-page]').forEach(el => {
        el.addEventListener('click', () => loadPage(el.dataset.page));
    });
    init();
});

window.showToast = showToast;
window.loadPage = loadPage;
