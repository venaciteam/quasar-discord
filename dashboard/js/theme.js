// ═══ Theme toggle (dark/light + auto) ═══

(function() {
    const STORAGE_KEY = 'quasar_theme';

    function getPreferred() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        // Update toggle buttons
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.textContent = theme === 'dark' ? '☀️' : '🌙';
            btn.title = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
        });
        // Update status bar color
        const meta = document.getElementById('meta-theme-color');
        if (meta) meta.content = theme === 'dark' ? '#0a0a0f' : '#f4f4f8';
    }

    function toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, next);
        apply(next);
    }

    // Init on load
    apply(getPreferred());

    // Listen for system theme changes (auto switch)
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
            apply(e.matches ? 'light' : 'dark');
        }
    });

    window.toggleTheme = toggle;
})();
