const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'atom.db');

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initTables();
        migrateTempVoice();
        migrateTickets();
    }
    return db;
}

function initTables() {
    db.exec(`
        -- Config générale par serveur
        CREATE TABLE IF NOT EXISTS guilds (
            guild_id TEXT PRIMARY KEY,
            name TEXT,
            settings TEXT DEFAULT '{}'
        );

        -- Modules activés/désactivés par serveur
        CREATE TABLE IF NOT EXISTS modules (
            guild_id TEXT NOT NULL,
            module_name TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            config TEXT DEFAULT '{}',
            PRIMARY KEY (guild_id, module_name),
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
        );

        -- Sanctions (modération)
        CREATE TABLE IF NOT EXISTS sanctions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            moderator_id TEXT NOT NULL,
            type TEXT NOT NULL,
            reason TEXT,
            duration TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            active INTEGER DEFAULT 1,
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
        );

        -- Welcome / Leave config
        CREATE TABLE IF NOT EXISTS welcome_config (
            guild_id TEXT PRIMARY KEY,
            welcome_channel TEXT,
            welcome_message TEXT,
            welcome_embed TEXT,
            welcome_enabled INTEGER DEFAULT 0,
            leave_channel TEXT,
            leave_message TEXT,
            leave_embed TEXT,
            leave_enabled INTEGER DEFAULT 0,
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
        );

        -- Autoroles
        CREATE TABLE IF NOT EXISTS autoroles (
            guild_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            PRIMARY KEY (guild_id, role_id),
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
        );

        -- Reaction role panels
        CREATE TABLE IF NOT EXISTS reaction_panels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT,
            title TEXT,
            mode TEXT DEFAULT 'multiple',
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
        );

        -- Reaction role entries
        CREATE TABLE IF NOT EXISTS reaction_roles (
            panel_id INTEGER NOT NULL,
            emoji TEXT NOT NULL,
            role_id TEXT NOT NULL,
            description TEXT,
            PRIMARY KEY (panel_id, emoji),
            FOREIGN KEY (panel_id) REFERENCES reaction_panels(id) ON DELETE CASCADE
        );

        -- Embeds sauvegardés
        CREATE TABLE IF NOT EXISTS embeds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            name TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
        );

        -- Commandes custom
        CREATE TABLE IF NOT EXISTS custom_commands (
            guild_id TEXT NOT NULL,
            name TEXT NOT NULL,
            response TEXT,
            embed_id INTEGER,
            allowed_roles TEXT DEFAULT '[]',
            allowed_channels TEXT DEFAULT '[]',
            PRIMARY KEY (guild_id, name),
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id),
            FOREIGN KEY (embed_id) REFERENCES embeds(id)
        );

        -- Musique config
        CREATE TABLE IF NOT EXISTS music_config (
            guild_id TEXT PRIMARY KEY,
            default_volume INTEGER DEFAULT 50,
            allowed_channels TEXT DEFAULT '[]',
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
        );

        -- Tickets : configuration par serveur
        CREATE TABLE IF NOT EXISTS ticket_config (
            guild_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            category_id TEXT,
            staff_role_id TEXT NOT NULL,
            welcome_message TEXT,
            enabled INTEGER DEFAULT 1,
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
        );

        -- Tickets : historique des tickets
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            opened_at TEXT DEFAULT (datetime('now')),
            closed_at TEXT,
            closed_by TEXT,
            close_reason TEXT,
            transcript TEXT,
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
        );

        -- TempVoice : triggers (plusieurs par guild, max 1 par catégorie)
        CREATE TABLE IF NOT EXISTS tempvoice_triggers (
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            category_id TEXT,
            enabled INTEGER DEFAULT 1,
            created_at INTEGER DEFAULT (unixepoch()),
            PRIMARY KEY (guild_id, channel_id)
        );

        -- TempVoice : préférences utilisateur par catégorie
        CREATE TABLE IF NOT EXISTS tempvoice_preferences (
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            category_id TEXT NOT NULL DEFAULT '',
            channel_name TEXT,
            user_limit INTEGER,
            updated_at INTEGER DEFAULT (unixepoch()),
            PRIMARY KEY (guild_id, user_id, category_id)
        );

        -- TempVoice : salons actuellement actifs
        CREATE TABLE IF NOT EXISTS tempvoice_active (
            channel_id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            category_id TEXT NOT NULL DEFAULT '',
            created_at INTEGER DEFAULT (unixepoch())
        );

        -- Indexes pour les performances
        CREATE INDEX IF NOT EXISTS idx_sanctions_guild ON sanctions(guild_id);
        CREATE INDEX IF NOT EXISTS idx_sanctions_guild_user ON sanctions(guild_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_embeds_guild ON embeds(guild_id);
        CREATE INDEX IF NOT EXISTS idx_reaction_panels_guild ON reaction_panels(guild_id);
        CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_guild_closed ON tickets(guild_id, closed_at);
        CREATE INDEX IF NOT EXISTS idx_tempvoice_active_guild ON tempvoice_active(guild_id);
        CREATE INDEX IF NOT EXISTS idx_tempvoice_prefs_updated ON tempvoice_preferences(updated_at);
    `);
}

function migrateTempVoice() {
    // Drop old single-trigger table if it exists
    try {
        const old = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tempvoice_config'").get();
        if (old) {
            db.exec('DROP TABLE tempvoice_config');
            console.log('[Atom] Migration: tempvoice_config → tempvoice_triggers');
        }
    } catch {}

    // Migrer tempvoice_active : ajouter category_id si manquant
    try {
        const cols = db.prepare("PRAGMA table_info(tempvoice_active)").all().map(c => c.name);
        if (!cols.includes('category_id')) {
            db.exec("ALTER TABLE tempvoice_active ADD COLUMN category_id TEXT NOT NULL DEFAULT ''");
            console.log('[Atom] Migration: tempvoice_active + category_id');
        }
    } catch {}

    // Migrer tempvoice_preferences : ajouter category_id si manquant
    try {
        const cols = db.prepare("PRAGMA table_info(tempvoice_preferences)").all().map(c => c.name);
        if (!cols.includes('category_id')) {
            // Recréer la table avec la nouvelle PK
            db.exec(`
                CREATE TABLE IF NOT EXISTS tempvoice_preferences_new (
                    guild_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    category_id TEXT NOT NULL DEFAULT '',
                    channel_name TEXT,
                    user_limit INTEGER,
                    updated_at INTEGER DEFAULT (unixepoch()),
                    PRIMARY KEY (guild_id, user_id, category_id)
                );
                INSERT OR IGNORE INTO tempvoice_preferences_new (guild_id, user_id, category_id, channel_name, user_limit, updated_at)
                    SELECT guild_id, user_id, '', channel_name, user_limit, updated_at FROM tempvoice_preferences;
                DROP TABLE tempvoice_preferences;
                ALTER TABLE tempvoice_preferences_new RENAME TO tempvoice_preferences;
            `);
            console.log('[Atom] Migration: tempvoice_preferences + category_id (PK)');
        }
    } catch {}

    // Purge des préférences > 90 jours
    try {
        const cutoff = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
        const result = db.prepare('DELETE FROM tempvoice_preferences WHERE updated_at < ?').run(cutoff);
        if (result.changes > 0) {
            console.log(`[Atom] TempVoice: ${result.changes} préférence(s) expirée(s) supprimée(s)`);
        }
    } catch {}
}

function migrateTickets() {
    try {
        const cols = db.pragma('table_info(ticket_config)').map(c => c.name);
        if (cols.length > 0 && !cols.includes('panel_title')) {
            db.exec('ALTER TABLE ticket_config ADD COLUMN panel_title TEXT');
            db.exec('ALTER TABLE ticket_config ADD COLUMN panel_description TEXT');
            console.log('[Atom] Migration: ticket_config + panel_title, panel_description');
        }
    } catch {}
}

module.exports = { getDb };
