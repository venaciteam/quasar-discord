# ⚛ Atom — Roadmap

## v0.1.0 — Release publique ✅

- [x] Repo GitHub public
- [x] One-liner install : `curl -sSL https://raw.githubusercontent.com/venaciteam/atom-discord/main/install.sh | bash`
- [x] Landing page avec compteur d'instances
- [x] Dashboard accessible sur le reseau local
- [ ] Tests sur Raspberry Pi 4
- [ ] Changelog / release notes

## v0.2.0 — Auto-update ✅

- [x] Endpoint `/api/version` — version locale (package.json) + derniere release GitHub
- [x] Check periodique (toutes les 12h ou au login dashboard)
- [x] Bandeau notification dans le dashboard quand une mise a jour est dispo
- [x] Bouton "Mettre a jour" avec log temps reel (SSE)
- [x] Rollback automatique si le build echoue
- [x] Page "Mise a jour" dans le dashboard (sidebar Systeme)
- [x] Support Docker (socket + host mount) et natif (git pull + npm ci)

## Ideas

- [ ] Systeme de plugins (modules activables/desactivables)
- [ ] Backup/restore config depuis le dashboard
- [ ] Support Fluxer (atom-fluxer)
