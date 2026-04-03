const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/auth');
const guildRoutes = require('./routes/guilds');
const moderationRoutes = require('./routes/moderation');
const welcomeRoutes = require('./routes/welcome');
const reactionrolesRoutes = require('./routes/reactionroles');
const embedsRoutes = require('./routes/embeds');
const customcmdsRoutes = require('./routes/customcmds');
const tempvoiceRoutes = require('./routes/tempvoice');
const ticketsRoutes = require('./routes/tickets');
const updateRoutes = require('./routes/update');

function createApi(discordClient) {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(cookieParser());

    // Rendre le client Discord accessible aux routes
    app.set('discordClient', discordClient);

    // Feedback webhook relay (bug reports / suggestions + VNCT design system)
    app.post(['/api/feedback', '/api/feedback/vnct'], (req, res) => {
        const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
        if (!webhookUrl) return res.status(503).json({ error: 'Feedback non configuré' });
        const { embeds } = req.body;
        if (!embeds || !Array.isArray(embeds)) return res.status(400).json({ error: 'Format invalide' });
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: embeds.slice(0, 1) })
        }).then(r => {
            if (r.ok) res.json({ success: true });
            else r.text().then(t => res.status(r.status).json({ error: t }));
        }).catch(() => res.status(500).json({ error: 'Envoi échoué' }));
    });

    // API routes
    app.use('/auth', authRoutes);
    app.use('/api/guilds', guildRoutes);
    app.use('/api/guilds/:guildId/moderation', moderationRoutes);
    app.use('/api/guilds/:guildId/welcome', welcomeRoutes);
    app.use('/api/guilds/:guildId/reactionroles', reactionrolesRoutes);
    app.use('/api/guilds/:guildId/embeds', embedsRoutes);
    app.use('/api/guilds/:guildId/customcmds', customcmdsRoutes);
    app.use('/api/guilds/:guildId/tempvoice', tempvoiceRoutes);
    app.use('/api/guilds/:guildId/tickets', ticketsRoutes);
    app.use('/api', updateRoutes);

    // Dashboard static files (ETag + no-cache for mutable assets)
    app.use('/dashboard', express.static(path.join(__dirname, '..', 'dashboard'), {
        etag: true,
        lastModified: true,
        setHeaders(res, filePath) {
            if (filePath.match(/\.(html|js|css)$/)) {
                res.setHeader('Cache-Control', 'no-cache');
            } else if (filePath.match(/\.(png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=604800');
            }
        }
    }));

    // Page d'accueil (landing)
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'dashboard', 'index.html'));
    });

    // Redirect /callback vers auth
    app.get('/callback', (req, res) => {
        // Passer à la route auth
        const url = `/auth/callback?${new URLSearchParams(req.query)}`;
        res.redirect(url);
    });

    return app;
}

module.exports = { createApi };
