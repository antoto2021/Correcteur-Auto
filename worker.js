importScripts('https://cdn.jsdelivr.net/npm/typo-js@1.1.0/typo.min.js');
importScripts('rules.js'); // <-- COUPLAGE DU FICHIER RULES.JS

let checker = null;

// [La fonction fetchWithProgress reste exactement la même]
async function fetchWithProgress(url, nomFichier, baseProgress, partDeProgression) {
    self.postMessage({ type: 'PROGRESS', progress: baseProgress, text: `Connexion pour ${nomFichier}...` });
    const response = await fetch(url);
    const contentLength = response.headers.get('content-length');
    
    if (!contentLength) {
        const text = await response.text();
        self.postMessage({ type: 'PROGRESS', progress: baseProgress + partDeProgression, text: `${nomFichier} téléchargé.` });
        return text;
    }

    const total = parseInt(contentLength, 10);
    let loaded = 0;
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let text = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.length;
        text += decoder.decode(value, { stream: true });
        const percent = (loaded / total) * partDeProgression;
        const moLoaded = Math.round((loaded / 1024 / 1024) * 10) / 10;
        self.postMessage({ type: 'PROGRESS', progress: baseProgress + percent, text: `Téléchargement ${nomFichier} (${moLoaded} Mo)...` });
    }
    text += decoder.decode(); 
    return text;
}

// [La fonction initChecker reste exactement la même]
async function initChecker() {
    if (checker) return; 
    const urlAff = "https://cdn.jsdelivr.net/gh/wooorm/dictionaries@main/dictionaries/fr/index.aff";
    const urlDic = "https://cdn.jsdelivr.net/gh/wooorm/dictionaries@main/dictionaries/fr/index.dic";
    
    const affData = await fetchWithProgress(urlAff, "des règles grammaticales", 0, 5);
    const dicData = await fetchWithProgress(urlDic, "du dictionnaire principal", 5, 25);

    self.postMessage({ type: 'PROGRESS', progress: 32, text: 'Construction du moteur...' });
    await new Promise(r => setTimeout(r, 150));
    checker = new Typo("fr_FR", affData, dicData);
}

self.onmessage = async function(e) {
    if (e.data.type === 'START') {
        await initChecker();
        self.postMessage({ type: 'PROGRESS', progress: 35, text: 'Analyse du document en cours...' });
        await analyserTexte(e.data.payload);
    }
};

async function analyserTexte(text) {
    let errors = [];

    // --- 1. ANALYSE GRAMMATICALE ET TYPOGRAPHIQUE (via rules.js) ---
    // On l'applique sur le texte brut pour préserver les espaces et le contexte
    grammarRules.forEach(rule => {
        let match;
        // On cherche toutes les occurrences de la règle dans le texte
        while ((match = rule.regex.exec(text)) !== null) {
            // On extrait un bout de phrase pour le contexte
            const contextStart = Math.max(0, match.index - 20);
            const contextEnd = Math.min(text.length, match.index + match[0].length + 20);
            const context = text.substring(contextStart, contextEnd).replace(/\n/g, ' '); // Enlève les sauts de ligne pour l'affichage

            errors.push({
                word: match[0], // L'erreur exacte trouvée
                context: context,
                type: rule.type,
                message: rule.message
            });
        }
    });

    // --- 2. ANALYSE ORTHOGRAPHIQUE (via Typo.js) ---
    const motsBruts = text.split(/\s+/);
    const totalWords = motsBruts.length;
    const chunkSize = 500; 
    let processedWords = 0;

    for (let i = 0; i < totalWords; i += chunkSize) {
        const chunk = motsBruts.slice(i, i + chunkSize);
        
        chunk.forEach((motBrut, index) => {
            let motPropre = motBrut.replace(/^[.,!?()\[\]{};:«»"“”\-_]+|[.,!?()\[\]{};:«»"“”\-_]+$/g, '');
            motPropre = motPropre.replace(/^[ldjmntsctyqu]['’]/i, '');

            if (motPropre.length > 1 && isNaN(motPropre)) {
                let estValide = checker.check(motPropre) || checker.check(motPropre.toLowerCase());

                if (!estValide && motPropre.includes('-')) {
                    const sousMots = motPropre.split('-');
                    estValide = sousMots.every(sm => sm.length <= 1 || checker.check(sm) || checker.check(sm.toLowerCase()));
                }

                if (!estValide) {
                    const globalIndex = i + index;
                    const contextStart = Math.max(0, globalIndex - 3);
                    const contextEnd = Math.min(totalWords, globalIndex + 4);
                    const context = motsBruts.slice(contextStart, contextEnd).join(' ');

                    errors.push({ 
                        word: motPropre, 
                        context: context,
                        type: "Orthographe",
                        message: "Mot inconnu dans le dictionnaire."
                    });
                }
            }
        });

        processedWords += chunk.length;
        const progress = 35 + (processedWords / totalWords) * 65; 
        self.postMessage({ type: 'PROGRESS', progress: progress, text: `Vérification : ${processedWords} mots sur ${totalWords}...` });
    }

    self.postMessage({ type: 'DONE', errors: errors, totalWords: totalWords });
}
