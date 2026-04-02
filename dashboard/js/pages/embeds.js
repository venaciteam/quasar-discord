async function loadEmbeds(container, guildId) {
    container.innerHTML = `
        <div class="main-header">
            <h1 class="main-title">📝 Embeds Custom</h1>
            <p class="main-subtitle">Crée et gère tes embeds Discord personnalisés</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start">
            <!-- Builder -->
            <div class="card">
                <div class="card-title">✏️ Builder</div>
                <div style="display:flex;flex-direction:column;gap:.75rem">
                    <div>
                        <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Nom (identifiant)</label>
                        <input class="input" id="embed-name" placeholder="ex: regles, annonce...">
                    </div>
                    <div>
                        <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Titre</label>
                        <input class="input" id="embed-title" placeholder="Titre de l'embed" oninput="updatePreview()">
                    </div>
                    <div>
                        <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Description</label>
                        <textarea class="input" id="embed-desc" rows="4" placeholder="Contenu de l'embed..." style="resize:vertical" oninput="updatePreview()"></textarea>
                    </div>
                    <div style="display:flex;gap:.75rem">
                        <div style="flex:1">
                            <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Couleur</label>
                            <input class="input" type="color" id="embed-color" value="#c86e8e" oninput="updatePreview()" style="height:38px;padding:.2rem">
                        </div>
                        <div style="flex:2">
                            <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Footer</label>
                            <input class="input" id="embed-footer" placeholder="Texte de pied de page" oninput="updatePreview()">
                        </div>
                    </div>
                    <div>
                        <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Image (URL)</label>
                        <input class="input" id="embed-image" placeholder="https://..." oninput="updatePreview()">
                    </div>
                    <div>
                        <label style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.3rem;display:block">Thumbnail (URL, petit coin haut droite)</label>
                        <input class="input" id="embed-thumbnail" placeholder="https://..." oninput="updatePreview()">
                    </div>
                    <p style="font-size:.75rem;color:var(--text-muted)">💡 Astuce : poste une image dans Discord, clic droit → Copier le lien de l'image.</p>
                    <div style="display:flex;gap:.75rem;flex-wrap:wrap">
                        <button class="btn btn-primary" onclick="saveEmbed()">💾 Sauvegarder</button>
                        <button class="btn" onclick="clearEmbedForm()">Effacer</button>
                    </div>
                </div>
            </div>

            <!-- Preview -->
            <div>
                <div class="card" style="margin-bottom:1.5rem">
                    <div class="card-title">👁️ Aperçu</div>
                    <div id="embed-preview" style="background:#313338;border-radius:8px;padding:1rem;min-height:80px">
                        <p style="color:rgba(255,255,255,.3);font-size:.85rem">L'aperçu apparaît ici au fur et à mesure...</p>
                    </div>
                </div>

                <!-- Liste embeds -->
                <div class="card">
                    <div class="card-title">📋 Embeds sauvegardés</div>
                    <div id="embeds-list"><p style="color:var(--text-secondary)">Chargement...</p></div>
                </div>
            </div>
        </div>
    `;

    window._guildId = guildId;
    refreshEmbedsList();

    // Ajouter le bloc commandes en bas
    container.innerHTML += renderCommandsBlock([
        ['/embed create [nom] [titre] [desc] [couleur]', 'Créer ou mettre à jour un embed'],
        ['/embed send [nom] #channel', 'Envoyer un embed dans un channel'],
        ['/embed edit [message_id] [nom]', 'Modifier un embed déjà envoyé'],
        ['/embed preview [nom]', 'Prévisualiser un embed (éphémère)'],
        ['/embed list', 'Voir les embeds sauvegardés'],
        ['/embed delete [nom]', 'Supprimer un embed'],
        ['/cmd create [nom] [reponse/embed]', 'Créer une commande custom'],
        ['/cmd edit [nom] [reponse/embed]', 'Modifier une commande'],
        ['/cmd delete [nom]', 'Supprimer une commande'],
        ['/cmd list', 'Lister les commandes custom']
    ]);
}

function parseDiscordMd(text) {
    if (!text) return text;
    return text
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/__(.+?)__/g, '<u>$1</u>')
        .replace(/~~(.+?)~~/g, '<s>$1</s>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,.1);padding:.1rem .3rem;border-radius:3px;font-size:.85em">$1</code>')
        .replace(/^> (.+)$/gm, '<div style="border-left:3px solid rgba(255,255,255,.2);padding-left:.6rem;color:var(--text-muted, #b9bbbe)">$1</div>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#00b0f4;text-decoration:none">$1</a>')
        .replace(/\n/g, '<br>');
}

function updatePreview() {
    const title = document.getElementById('embed-title').value;
    const desc = document.getElementById('embed-desc').value;
    const color = document.getElementById('embed-color').value;
    const footer = document.getElementById('embed-footer').value;
    const image = document.getElementById('embed-image').value;
    const thumbnail = document.getElementById('embed-thumbnail').value;

    const preview = document.getElementById('embed-preview');
    preview.innerHTML = `
        <div style="border-left:4px solid ${color};padding-left:12px">
            ${thumbnail && /^https?:\/\//i.test(thumbnail) ? `<img src="${thumbnail}" style="float:right;max-width:80px;max-height:80px;border-radius:4px;margin-left:12px" onerror="this.style.display='none'">` : ''}
            ${title ? `<div style="font-weight:700;color:#fff;margin-bottom:.4rem;font-size:.95rem">${parseDiscordMd(title)}</div>` : ''}
            ${desc ? `<div style="color:#dbdee1;font-size:.875rem">${parseDiscordMd(desc)}</div>` : ''}
            ${image && /^https?:\/\//i.test(image) ? `<img src="${image}" style="max-width:100%;border-radius:4px;margin-top:.75rem;display:block" onerror="this.style.display='none'">` : ''}
            ${footer ? `<div style="color:#87898c;font-size:.75rem;margin-top:.75rem;border-top:1px solid rgba(255,255,255,.1);padding-top:.5rem">${footer}</div>` : ''}
        </div>
    `;
}

let _savingEmbed = false;
async function saveEmbed() {
    if (_savingEmbed) return;
    const name = document.getElementById('embed-name').value.trim();
    const title = document.getElementById('embed-title').value;
    const desc = document.getElementById('embed-desc').value;

    if (!name) return showToast('❌ Un nom est requis.', 'error');
    if (!title && !desc) return showToast('❌ Titre ou description requis.', 'error');
    _savingEmbed = true;

    const data = {
        couleur: document.getElementById('embed-color').value,
        titre: title || undefined,
        description: desc || undefined,
        footer: document.getElementById('embed-footer').value || undefined,
        image: document.getElementById('embed-image').value || undefined,
        thumbnail: document.getElementById('embed-thumbnail').value || undefined
    };

    try {
        await API.post(`/api/guilds/${window._guildId}/embeds`, { name, data });
        showToast(`✅ Embed "${name}" sauvegardé !`);
        clearEmbedForm();
        refreshEmbedsList();
    } finally { _savingEmbed = false; }
}

async function refreshEmbedsList() {
    const embeds = await API.get(`/api/guilds/${window._guildId}/embeds`) || [];
    const list = document.getElementById('embeds-list');

    if (!embeds.length) {
        list.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">Aucun embed sauvegardé.</p>';
        return;
    }

    list.innerHTML = embeds.map(e => `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.6rem .75rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:.5rem">
            <span style="flex:1;font-size:.9rem;font-weight:500">📝 ${e.name}</span>
            <button class="btn" style="font-size:.75rem;padding:.3rem .6rem" onclick="loadEmbed(${JSON.stringify(e).replace(/"/g, '&quot;')})">Éditer</button>
            <button class="btn btn-danger" style="font-size:.75rem;padding:.3rem .6rem" onclick="deleteEmbed(${e.id}, '${e.name}')">🗑️</button>
        </div>
    `).join('');
}

function loadEmbed(embed) {
    document.getElementById('embed-name').value = embed.name;
    document.getElementById('embed-title').value = embed.data.titre || '';
    document.getElementById('embed-desc').value = embed.data.description || '';
    document.getElementById('embed-color').value = embed.data.couleur || '#c86e8e';
    document.getElementById('embed-footer').value = embed.data.footer || '';
    document.getElementById('embed-image').value = embed.data.image || '';
    document.getElementById('embed-thumbnail').value = embed.data.thumbnail || '';
    updatePreview();
}

async function deleteEmbed(id, name) {
    if (!confirm(`Supprimer l'embed "${name}" ?`)) return;
    await API.delete(`/api/guilds/${window._guildId}/embeds/${id}`);
    showToast(`🗑️ Embed "${name}" supprimé.`);
    refreshEmbedsList();
}

function clearEmbedForm() {
    ['embed-name','embed-title','embed-desc','embed-footer','embed-image','embed-thumbnail'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('embed-color').value = '#c86e8e';
    document.getElementById('embed-preview').innerHTML = '<p style="color:rgba(255,255,255,.3);font-size:.85rem">L\'aperçu apparaît ici au fur et à mesure...</p>';
}

window.loadEmbeds = loadEmbeds;
window.updatePreview = updatePreview;
window.saveEmbed = saveEmbed;
window.loadEmbed = loadEmbed;
window.deleteEmbed = deleteEmbed;
window.clearEmbedForm = clearEmbedForm;
