importScripts('https://cdn.jsdelivr.net/npm/typo-js@1.1.0/typo.min.js');
importScripts('rules.js'); // <-- COUPLAGE DU FICHIER RULES.JS

let checker = null;
let dynamicDict = new Set(); // NOUVEAU : Pour stocker les mots de l'utilisateur

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
        // NOUVEAU : On récupère le dictionnaire utilisateur envoyé par main.js
        if (e.data.customDict) {
            dynamicDict = new Set(e.data.customDict.map(w => w.toLowerCase()));
        }

        await initChecker();
        self.postMessage({ type: 'PROGRESS', progress: 35, text: 'Analyse du document en cours...' });
        await analyserTexte(e.data.payload);
    }
};;

async function analyserTexte(text) {
    let errors = [];

    // Découpage du texte en PARAGRAPHES (ignore les lignes vides)
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    const totalParagraphs = paragraphs.length;
    let totalWords = 0;
    let processedParagraphs = 0;

    // On boucle sur chaque paragraphe
    for (let i = 0; i < totalParagraphs; i++) {
        const paragraph = paragraphs[i];
        const motsBruts = paragraph.split(/\s+/).filter(m => m.trim().length > 0);
        totalWords += motsBruts.length;

        // 1. ANALYSE GRAMMATICALE ET TYPO (sur le paragraphe entier)
        grammarRules.forEach(rule => {
            let match;
            rule.regex.lastIndex = 0; // Réinitialise la regex
            while ((match = rule.regex.exec(paragraph)) !== null) {
                errors.push({
                    word: match[0], 
                    context: paragraph, // On renvoie tout le paragraphe !
                    type: rule.type,
                    message: rule.message
                });
            }
        });

        // 2. ANALYSE ORTHOGRAPHIQUE (mot par mot dans le paragraphe)
        motsBruts.forEach(motBrut => {
            let motPropre = motBrut.replace(/^[.,!?()\[\]{};:«»"“”\-_]+|[.,!?()\[\]{};:«»"“”\-_]+$/g, '');
            motPropre = motPropre.replace(/^(l|d|j|m|n|t|s|c|y|qu|jusqu|lorsqu|puisqu|quoiqu)['’´‘]/i, '');

            if (motPropre.length > 1 && isNaN(motPropre)) {
                const estAcronyme = (motPropre === motPropre.toUpperCase());
                const estDansDictPerso = (typeof dictionnairePersonnel !== 'undefined' && dictionnairePersonnel.has(motPropre.toLowerCase())) || dynamicDict.has(motPropre.toLowerCase());

                if (!estAcronyme && !estDansDictPerso) {
                    let estValide = checker.check(motPropre) || checker.check(motPropre.toLowerCase());

                    if (!estValide && motPropre.includes('-')) {
                        const sousMots = motPropre.split('-');
                        estValide = sousMots.every(sm => sm.length <= 1 || checker.check(sm) || checker.check(sm.toLowerCase()));
                    }

                    if (!estValide) {
                        errors.push({ 
                            word: motPropre, 
                            context: paragraph, // On renvoie tout le paragraphe !
                            type: "Orthographe",
                            message: "Mot inconnu dans le dictionnaire."
                        });
                    }
                }
            }
        });

        processedParagraphs++;
        
        // Mise à jour de la jauge (pour ne pas saturer, on l'envoie tous les 5 paragraphes)
        if (processedParagraphs % 5 === 0 || processedParagraphs === totalParagraphs) {
            const progress = 35 + (processedParagraphs / totalParagraphs) * 65; 
            self.postMessage({ type: 'PROGRESS', progress: progress, text: `Analyse : ${processedParagraphs} paragraphes sur ${totalParagraphs}...` });
        }
    }

    self.postMessage({ type: 'DONE', errors: errors, totalWords: totalWords });
}
