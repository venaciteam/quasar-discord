# ⚛ Atom — Roadmap

## v1.0.0 — Release publique ✅

- [x] Repo GitHub public
- [x] One-liner install : `curl -sSL https://raw.githubusercontent.com/venaciteam/atom-discord/main/install.sh | bash`
- [x] Landing page avec compteur d'instances
- [x] Dashboard accessible sur le reseau local
- [ ] Tests sur Raspberry Pi 4
- [ ] Changelog / release notes

## v1.1.0 — Auto-update

- [ ] Endpoint `/api/version` — version locale (package.json) + derniere release GitHub
- [ ] Check periodique (toutes les 12h ou au login dashboard)
- [ ] Bandeau notification dans le dashboard quand une mise a jour est dispo
- [ ] Bouton "Mettre a jour" avec log temps reel
- [ ] Rollback automatique si le build echoue

## Ideas

- [ ] Systeme de plugins (modules activables/desactivables)
- [ ] Backup/restore config depuis le dashboard
- [ ] Support Fluxer (atom-fluxer)
