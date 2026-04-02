/**
 * Convertit les emojis Discord custom (<:name:id> ou <a:name:id>) en images
 */
function renderEmoji(emojiStr) {
    // Custom emoji : <:name:id> ou <a:name:id>
    const customMatch = emojiStr.match(/^<(a)?:(\w+):(\d+)>$/);
    if (customMatch) {
        const animated = customMatch[1] === 'a';
        const name = customMatch[2];
        const id = customMatch[3];
        const ext = animated ? 'gif' : 'png';
        return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}" alt="${name}" title=":${name}:" style="width:1.2em;height:1.2em;vertical-align:middle;object-fit:contain">`;
    }
    // Unicode emoji : retourner tel quel
    return emojiStr;
}

/**
 * Escape HTML pour prévenir XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Debounce un bouton : désactive pendant l'exécution de fn, puis réactive
 */
function withDebounce(btn, fn) {
    if (btn.disabled) return;
    btn.disabled = true;
    const original = btn.textContent;
    Promise.resolve(fn()).finally(() => {
        btn.disabled = false;
        btn.textContent = original;
    });
}

window.renderEmoji = renderEmoji;
window.escapeHtml = escapeHtml;
window.withDebounce = withDebounce;
