// === LE CERVEAU ORTHOGRAPHIQUE (V1) ===
// Pour le moment, un mini-dictionnaire pour la preuve de concept.
// Plus tard, nous pourrons charger un vrai dictionnaire Hunspell ici.
const dictionnaire = new Set([
    "le", "la", "les", "un", "une", "des", "je", "tu", "il", "elle", "nous", "vous", "ils", "elles",
    "est", "sont", "bonjour", "test", "fichier", "document", "mot", "phrase", "avec", "pour", "dans"
]);

// Fonction pour simuler un délai (pour bien voir la jauge de progression tourner)
const sleep = ms => new Promise(r => setTimeout(r, ms));

self.onmessage = async function(e) {
    if (e.data.type === 'START') {
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
            
            // Si le mot n'est pas vide et n'est pas dans notre dictionnaire (très basique)
            if (motPropre.length > 1 && !dictionnaire.has(motPropre) && isNaN(motPropre)) {
                
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
        const progress = (processedWords / totalWords) * 100;
        
        // Simule un traitement lourd pour que vous voyiez la jauge de progression
        await sleep(50); 

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
