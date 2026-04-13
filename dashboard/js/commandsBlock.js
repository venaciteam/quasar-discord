/**
 * Génère un bloc HTML "Commandes disponibles" pour une page de module
 */
function renderCommandsBlock(commands) {
    return `
        <div class="card" style="margin-top:1.5rem">
            <div class="card-title">💬 Commandes disponibles</div>
            <div class="commands-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:.75rem">
                ${commands.map(([cmd, desc]) => `
                    <div style="padding:.6rem .9rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm)">
                        <code style="color:var(--accent);font-size:.85rem">${cmd}</code>
                        <p style="color:var(--text-secondary);font-size:.8rem;margin-top:.2rem">${desc}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.renderCommandsBlock = renderCommandsBlock;
