// ═══ FAB Menu — Késako, Bug, Suggestion ═══

const APP_NAME = 'Atom';

function getTechInfo() {
    const version = document.getElementById('versionBadge')?.textContent || 'inconnue';
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    const platform = isMobile ? 'Mobile' : 'Desktop';
    const date = new Date().toLocaleString('fr-FR');
    return { version, platform, ua, date };
}

function initFab() {
    // FAB container
    const fab = document.createElement('div');
    fab.className = 'fab-container';
    fab.id = 'fab';
    fab.innerHTML = `
        <div class="fab-menu">
            <button class="fab-btn kesako" onclick="openKesako()">
                <span class="fab-icon">💡</span> Késako
            </button>
            <button class="fab-btn bug" onclick="openBugReport()">
                <span class="fab-icon">🐛</span> Signaler un bug
            </button>
            <button class="fab-btn suggestion" onclick="openSuggestion()">
                <span class="fab-icon">✨</span> Suggestion
            </button>
        </div>
        <button class="fab-toggle" onclick="toggleFab()">
            <svg class="fab-star" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0 C12 0 14 9 24 12 C14 15 12 24 12 24 C12 24 10 15 0 12 C10 9 12 0 12 0Z"/>
            </svg>
        </button>
    `;
    document.body.appendChild(fab);

    // Modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
    overlay.innerHTML = '<div class="modal" id="modal-content"></div>';
    document.body.appendChild(overlay);
}

function toggleFab() {
    document.getElementById('fab').classList.toggle('open');
}

function closeFab() {
    document.getElementById('fab').classList.remove('open');
}

function openModal(html) {
    closeFab();
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('visible');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('visible');
}

function renderTechInfo() {
    const info = getTechInfo();
    return `
        <div style="margin-top:1rem;padding:.75rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.75rem;color:var(--text-muted)">
            <strong style="color:var(--text-secondary)">Infos techniques (auto)</strong><br>
            Version : ${info.version}<br>
            Plateforme : ${info.platform}<br>
            Navigateur : ${info.ua.slice(0, 80)}…<br>
            Date : ${info.date}
        </div>
    `;
}

function openKesako() {
    openModal(`
        <h2>💡 C'est quoi Atom ?</h2>
        <div class="kesako-section">
            <p>Atom est un bot Discord custom — il gère la modération, les messages de bienvenue, les rôles automatiques, les embeds personnalisés, et peut même jouer de la musique.</p>
            <p>Ce dashboard te permet de tout configurer sans toucher à une seule commande.</p>
        </div>
        <hr class="kesako-divider">
        <div class="kesako-section">
            <h4>🔍 Pour les curieux</h4>
            <p>Atom tourne sur un serveur privé, sans dépendance à un service tiers payant. Les données (sanctions, configs, embeds) sont stockées localement dans une base SQLite. L'authentification passe par Discord OAuth2 — aucun mot de passe n'est stocké, on vérifie juste que tu es admin du serveur.</p>
        </div>
        <button class="btn btn-primary close-btn" onclick="closeModal()">Compris !</button>
    `);
}

function openBugReport() {
    openModal(`
        <h2>🐛 Signaler un bug</h2>
        <div style="display:flex;flex-direction:column;gap:.75rem">
            <div>
                <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Description du problème</label>
                <textarea class="input" id="bug-desc" rows="3" placeholder="Décrivez le problème rencontré." style="resize:vertical"></textarea>
            </div>
            <div>
                <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Étapes pour reproduire</label>
                <textarea class="input" id="bug-steps" rows="3" placeholder="1. J'ai ouvert la page&#10;2. J'ai cliqué sur…&#10;3. …" style="resize:vertical"></textarea>
            </div>
            <div>
                <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Contact (optionnel)</label>
                <input class="input" id="bug-contact" placeholder="Discord, email...">
            </div>
            ${renderTechInfo()}
            <div style="display:flex;gap:.75rem">
                <button class="btn btn-primary" id="bug-submit" onclick="submitBug()" style="flex:1">🐛 Envoyer</button>
                <button class="btn" onclick="closeModal()">Annuler</button>
            </div>
        </div>
    `);
}

function openSuggestion() {
    openModal(`
        <h2>✨ Suggestion</h2>
        <div style="display:flex;flex-direction:column;gap:.75rem">
            <div>
                <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Ton idée ou suggestion</label>
                <textarea class="input" id="suggestion-desc" rows="4" placeholder="Qu'est-ce que tu aimerais voir ?" style="resize:vertical"></textarea>
            </div>
            <div>
                <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Contact (optionnel)</label>
                <input class="input" id="suggestion-contact" placeholder="Discord, email...">
            </div>
            ${renderTechInfo()}
            <div style="display:flex;gap:.75rem">
                <button class="btn btn-gold" id="suggest-submit" onclick="submitSuggestion()" style="flex:1">✨ Envoyer</button>
                <button class="btn" onclick="closeModal()">Annuler</button>
            </div>
        </div>
    `);
}

async function submitBug() {
    const desc = document.getElementById('bug-desc').value.trim();
    const steps = document.getElementById('bug-steps').value.trim();
    const contact = document.getElementById('bug-contact').value.trim();
    if (!desc) return showToast('Décrivez le problème avant d\'envoyer', 'error');

    const info = getTechInfo();
    const btn = document.getElementById('bug-submit');
    btn.disabled = true; btn.textContent = '⏳ Envoi…';

    const fields = [
        { name: '🐛 Description', value: desc.slice(0, 1024) },
        { name: '🔁 Étapes pour reproduire', value: (steps || 'Non précisé').slice(0, 1024) },
        { name: '🏷️ Version', value: info.version, inline: true },
        { name: '💻 Plateforme', value: info.platform, inline: true },
        { name: '🌐 Navigateur', value: info.ua.slice(0, 256) },
    ];
    if (contact) fields.push({ name: '📬 Contact', value: contact.slice(0, 256) });

    try {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'bug', embeds: [{ title: `🐛 Bug Report — ${APP_NAME}`, color: 0xc86e8e, fields, timestamp: new Date().toISOString() }] })
        });
        showToast('Merci pour ton retour ! 🐛');
        closeModal();
    } catch {
        showToast('Erreur lors de l\'envoi', 'error');
    }
    btn.disabled = false; btn.textContent = '🐛 Envoyer';
}

async function submitSuggestion() {
    const desc = document.getElementById('suggestion-desc').value.trim();
    const contact = document.getElementById('suggestion-contact').value.trim();
    if (!desc) return showToast('Décris ton idée avant d\'envoyer', 'error');

    const info = getTechInfo();
    const btn = document.getElementById('suggest-submit');
    btn.disabled = true; btn.textContent = '⏳ Envoi…';

    const fields = [
        { name: '✨ Suggestion', value: desc.slice(0, 1024) },
        { name: '🏷️ Version', value: info.version, inline: true },
        { name: '💻 Plateforme', value: info.platform, inline: true },
    ];
    if (contact) fields.push({ name: '📬 Contact', value: contact.slice(0, 256) });

    try {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'suggestion', embeds: [{ title: `✨ Suggestion — ${APP_NAME}`, color: 0xc8a86e, fields, timestamp: new Date().toISOString() }] })
        });
        showToast('Merci pour ta suggestion ! ✨');
        closeModal();
    } catch {
        showToast('Erreur lors de l\'envoi', 'error');
    }
    btn.disabled = false; btn.textContent = '✨ Envoyer';
}

// Init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFab);
} else {
    initFab();
}

window.toggleFab = toggleFab;
window.openKesako = openKesako;
window.openBugReport = openBugReport;
window.openSuggestion = openSuggestion;
window.submitBug = submitBug;
window.submitSuggestion = submitSuggestion;
window.closeModal = closeModal;
