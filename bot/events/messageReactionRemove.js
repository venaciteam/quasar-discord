// Plus nécessaire pour les reaction roles (le bot retire la réaction de l'user immédiatement)
// Ce fichier est gardé vide pour éviter les erreurs de chargement
module.exports = {
    name: 'messageReactionRemove',
    once: false,
    async execute(reaction, user) {
        // Intentionnellement vide
    }
};
