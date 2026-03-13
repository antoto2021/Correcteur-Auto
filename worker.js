// === LE CERVEAU ORTHOGRAPHIQUE LOCAL COMPLET (TYPO.JS + HUNSPELL FR) ===
// Charge la bibliothèque Typo.js en asynchronisme
importScripts('https://cdn.jsdelivr.net/npm/typo-js@1.1.0/typo.min.js');

// Instance de Typo.js pour la correction
let checker = null;

// Fonction asynchrone pour initialiser le dictionnaire
async function initChecker() {
    if (checker) return; // Déjà initialisé

    try {
        // Chargement asynchrone des fichiers dictionnaire (fr_FR) depuis jsDelivr
        // Les fichiers sont volumineux (plusieurs Mo), c'est pourquoi on le fait dans le worker
        checker = new Typo("fr_FR", null, null, {
            platform: "any",
            loadAsynchronously: true,
            dictionaryPath: "https://cdn.jsdelivr.net/gh/wooorm/dictionaries@main/dictionaries/fr"
        });
        
        // Attendre que Typo.js confirme que le dictionnaire est chargé
        return new Promise((resolve) => {
            checker.loaded = () => resolve();
        });
    } catch (error) {
        console.error("Erreur d'initialisation du dictionnaire : ", error);
    }
}

// Fonction pour simuler un délai (pour bien voir la jauge de progression tourner)
const sleep = ms => new Promise(r => setTimeout(r, ms));

self.onmessage = async function(e) {
    if (e.data.type === 'START') {
        // 1. Initialise le dictionnaire avant tout (seulement la première fois)
        self.postMessage({ type: 'PROGRESS', progress: 0, text: 'Initialisation du dictionnaire...' });
        await initChecker();
        
        // 2. Démarre l'analyse
        self.postMessage({ type: 'PROGRESS', progress: 10, text: 'Analyse en cours...' });
        const text = e.data.payload;
        await analyserTexte(text);
    }
};

async function analyserTexte(text) {
    // Nettoyage basique et découpage en mots
    const motsBruts = text.split(/\s+/);
    const totalWords = motsBruts.length;
    let errors = [];
    
    // On définit la taille des blocs (Chunks) pour mettre à jour la jauge
    const chunkSize = 500; 
    let processedWords = 0;

    for (let i = 0; i < totalWords; i += chunkSize) {
        const chunk = motsBruts.slice(i, i + chunkSize);
        
        // Analyse du bloc
        chunk.forEach((motBrut, index) => {
            // Retire la ponctuation
            const motPropre = motBrut.replace(/[.,!?()";:]/g, '').toLowerCase();
            
            // Si le mot n'est pas vide, n'est pas un nombre, et que Typo.js ne le valide pas
            if (motPropre.length > 1 && !checker.check(motPropre) && isNaN(motPropre)) {
                
                // On récupère le contexte (3 mots avant, 3 mots après)
                const globalIndex = i + index;
                const contextStart = Math.max(0, globalIndex - 3);
                const contextEnd = Math.min(totalWords, globalIndex + 4);
                const context = motsBruts.slice(contextStart, contextEnd).join(' ');

                errors.push({
                    word: motBrut,
                    context: context
                });
            }
        });

        processedWords += chunk.length;
        // On compense le début d'initialisation pour la progression
        const progress = 10 + (processedWords / totalWords) * 90; 
        
        // Simule un traitement pour que vous voyiez la jauge (enlevez pour vitesse réelle)
        // await sleep(50); 

        // Envoie la progression au fichier principal
        self.postMessage({ type: 'PROGRESS', progress: progress });
    }

    // Analyse terminée
    self.postMessage({ 
        type: 'DONE', 
        errors: errors, 
        totalWords: totalWords 
    });
}
