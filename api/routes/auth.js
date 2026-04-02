const express = require('express');
const { generateToken } = require('../middleware/auth');
const router = express.Router();

const DISCORD_API = 'https://discord.com/api/v10';

// Redirect vers Discord OAuth2
router.get('/login', (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: process.env.CALLBACK_URL,
        response_type: 'code',
        scope: 'identify guilds'
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

// Callback OAuth2
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/?error=no_code');

    try {
        // Échanger le code contre un token
        const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.CALLBACK_URL
            })
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            return res.redirect('/?error=token_failed');
        }

        // Récupérer l'utilisateur
        const userRes = await fetch(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const user = await userRes.json();

        // Récupérer les guilds de l'utilisateur
        const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const guilds = await guildsRes.json();

        // Générer JWT
        const jwt = generateToken({
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            guilds: guilds.map(g => ({
                id: g.id,
                name: g.name,
                icon: g.icon,
                permissions: g.permissions
            }))
        });

        // Cookie sécurisé + redirect
        // Passer le token via URL pour stockage en localStorage (évite les problèmes de cookie avec Cloudflare)
        res.redirect(`/dashboard/app.html?token=${jwt}`);
    } catch (error) {
        console.error('[Atom] Erreur OAuth2:', error);
        res.redirect('/?error=auth_failed');
    }
});

// Déconnexion
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// Info utilisateur connecté
router.get('/me', (req, res) => {
    const token = req.cookies?.token
        || req.headers.authorization?.replace('Bearer ', '')
        || req.query.token;
    if (!token) return res.json({ authenticated: false });

    const { verifyToken } = require('../middleware/auth');
    const user = verifyToken(token);
    if (!user) return res.json({ authenticated: false });

    res.json({ authenticated: true, user });
});

module.exports = router;
