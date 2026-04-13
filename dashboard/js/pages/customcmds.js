async function loadCustomCmds(container, guildId) {
    container.innerHTML = `
        <div class="main-header">
            <h1 class="main-title">⚡ Commandes Custom</h1>
            <p class="main-subtitle">Crée et gère des commandes personnalisées</p>
        </div>
        <div id="cmds-content"><p style="color:var(--text-secondary)">Chargement...</p></div>
    `;

    window._guildId = guildId;

    const [cmds, embeds] = await Promise.all([
        API.get(`/api/guilds/${guildId}/customcmds`),
        API.get(`/api/guilds/${guildId}/embeds`)
    ]);

    window._availableEmbeds = embeds || [];

    const container2 = document.getElementById('cmds-content');
    container2.innerHTML = `
        <!-- Créer une commande -->
        <div class="card">
            <div class="card-title">✏️ Créer une commande</div>
            <div style="display:flex;flex-direction:column;gap:.75rem">
                <div>
                    <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Nom de la commande (sans /)</label>
                    <input class="input" id="cmd-name" placeholder="ex: regles, socials, info..." style="max-width:300px">
                </div>
                <div>
                    <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Type de réponse</label>
                    <div style="display:flex;gap:.75rem;flex-wrap:wrap">
                        <label style="display:inline-flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.9rem">
                            <input type="radio" name="cmd-type" value="text" checked onchange="toggleCmdType()"> Texte
                        </label>
                        <label style="display:inline-flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.9rem">
                            <input type="radio" name="cmd-type" value="embed" onchange="toggleCmdType()"> Embed sauvegardé
                        </label>
                    </div>
                </div>
                <div id="cmd-text-field">
                    <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Réponse texte</label>
                    <textarea class="input" id="cmd-response" rows="3" placeholder="Le texte que le bot répondra..." style="resize:vertical"></textarea>
                    <p style="font-size:.75rem;color:var(--text-muted);margin-top:.3rem">Supporte le markdown Discord : **gras**, *italique*, __souligné__, etc.</p>
                </div>
                <div id="cmd-embed-field" style="display:none">
                    <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Embed à utiliser</label>
                    <select class="select" id="cmd-embed-select" style="max-width:300px">
                        <option value="">Choisir un embed...</option>
                        ${(embeds || []).map(e => `<option value="${e.name}">📝 ${e.name}</option>`).join('')}
                    </select>
                    ${embeds?.length === 0 ? '<p style="font-size:.8rem;color:var(--text-muted);margin-top:.3rem">Aucun embed — crée-en un dans la section Embeds d\'abord.</p>' : ''}
                </div>
                <div style="display:flex;gap:.75rem">
                    <button class="btn btn-primary" onclick="createCmd()">Créer la commande</button>
                </div>
            </div>
        </div>

        <!-- Liste des commandes -->
        <div class="card">
            <div class="card-title">⚡ Commandes actives (${(cmds || []).length})</div>
            <div id="cmds-list">
                ${renderCmds(cmds)}
            </div>
        </div>
    `;

    container2.innerHTML += renderCommandsBlock([
        ['/cmd create [nom] [reponse]', 'Créer une commande texte'],
        ['/cmd create [nom] embed:[nom_embed]', 'Créer une commande liée à un embed'],
        ['/cmd edit [nom] [reponse/embed]', 'Modifier une commande existante'],
        ['/cmd delete [nom]', 'Supprimer une commande'],
        ['/cmd list', 'Lister toutes les commandes']
    ]);
}

function renderCmds(cmds) {
    if (!cmds || cmds.length === 0) {
        return '<p style="color:var(--text-muted);font-size:.85rem">Aucune commande custom.</p>';
    }

    return `<div style="display:flex;flex-direction:column;gap:.5rem" id="cmds-list-inner" onclick="handleCmdAction(event)">
        ${cmds.map(c => `
            <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm)">
                <code style="color:var(--accent);font-size:.9rem;min-width:100px">/${c.name}</code>
                <span style="flex:1;color:var(--text-secondary);font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    ${c.embed_id ? `📝 Embed : <strong>${c.embed_name || 'lié'}</strong>` : (c.response?.substring(0, 80) + (c.response?.length > 80 ? '…' : '') || '*vide*')}
                </span>
                <button class="btn" style="font-size:.75rem;padding:.3rem .6rem" data-action="edit" data-name="${c.name}" data-response="${(c.response || '').replace(/"/g, '&quot;')}" data-embed="${c.embed_name || ''}">✏️</button>
                <button class="btn btn-danger" style="font-size:.75rem;padding:.3rem .6rem" data-action="delete" data-name="${c.name}">🗑️</button>
            </div>
        `).join('')}
    </div>`;
}

function toggleCmdType() {
    const type = document.querySelector('input[name="cmd-type"]:checked').value;
    document.getElementById('cmd-text-field').style.display = type === 'text' ? 'block' : 'none';
    document.getElementById('cmd-embed-field').style.display = type === 'embed' ? 'block' : 'none';
}

let _creatingCmd = false;
async function createCmd() {
    if (_creatingCmd) return;
    const name = document.getElementById('cmd-name').value.trim();
    if (!name) return showToast('❌ Un nom est requis.', 'error');
    _creatingCmd = true;

    const type = document.querySelector('input[name="cmd-type"]:checked').value;
    const body = { name };

    if (type === 'text') {
        body.response = document.getElementById('cmd-response').value.trim();
        if (!body.response) return showToast('❌ Le texte de réponse est requis.', 'error');
    } else {
        body.embed_name = document.getElementById('cmd-embed-select').value;
        if (!body.embed_name) return showToast('❌ Sélectionne un embed.', 'error');
    }

    try {
        const result = await API.post(`/api/guilds/${window._guildId}/customcmds`, body);
        if (result.error) return showToast(`❌ ${result.error}`, 'error');

        showToast(`✅ Commande /${name} créée !`);
        document.getElementById('cmd-name').value = '';
        document.getElementById('cmd-response').value = '';
        const container = document.getElementById('cmds-content').parentElement;
        loadCustomCmds(container, window._guildId);
    } finally { _creatingCmd = false; }
}

function editCmd(name, response, embedName) {
    document.getElementById('cmd-name').value = name;
    document.getElementById('cmd-name').disabled = true;

    if (embedName) {
        document.querySelector('input[name="cmd-type"][value="embed"]').checked = true;
        toggleCmdType();
        document.getElementById('cmd-embed-select').value = embedName;
    } else {
        document.querySelector('input[name="cmd-type"][value="text"]').checked = true;
        toggleCmdType();
        document.getElementById('cmd-response').value = response || '';
    }

    // Changer le bouton en "Modifier"
    const createBtn = document.querySelector('#cmds-content .btn-primary');
    createBtn.textContent = 'Modifier la commande';
    createBtn.onclick = async () => {
        const type = document.querySelector('input[name="cmd-type"]:checked').value;
        const body = {};

        if (type === 'text') {
            body.response = document.getElementById('cmd-response').value.trim();
            if (!body.response) return showToast('❌ Le texte de réponse est requis.', 'error');
        } else {
            body.embed_name = document.getElementById('cmd-embed-select').value;
            if (!body.embed_name) return showToast('❌ Sélectionne un embed.', 'error');
        }

        const result = await API.put(`/api/guilds/${window._guildId}/customcmds/${name}`, body);
        if (result.error) return showToast(`❌ ${result.error}`, 'error');

        showToast(`✅ Commande /${name} modifiée !`);
        document.getElementById('cmd-name').disabled = false;
        const container = document.getElementById('cmds-content').parentElement;
        loadCustomCmds(container, window._guildId);
    };

    // Scroll vers le formulaire
    document.getElementById('cmd-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function deleteCmd(name) {
    if (!confirm(`Supprimer la commande /${name} ?`)) return;
    await API.delete(`/api/guilds/${window._guildId}/customcmds/${name}`);
    showToast(`🗑️ Commande /${name} supprimée.`);
    const container = document.getElementById('cmds-content').parentElement;
    loadCustomCmds(container, window._guildId);
}

function handleCmdAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'edit') editCmd(btn.dataset.name, btn.dataset.response, btn.dataset.embed);
    if (btn.dataset.action === 'delete') deleteCmd(btn.dataset.name);
}

window.loadCustomCmds = loadCustomCmds;
window.toggleCmdType = toggleCmdType;
window.createCmd = createCmd;
window.editCmd = editCmd;
window.deleteCmd = deleteCmd;
window.handleCmdAction = handleCmdAction;
