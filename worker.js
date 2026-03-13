importScripts('https://cdn.jsdelivr.net/npm/typo-js@1.1.0/typo.min.js');

let checker = null;

// Fonction pour télécharger un fichier en mesurant la progression octet par octet
async function fetchWithProgress(url, nomFichier, baseProgress, partDeProgression) {
    self.postMessage({ type: 'PROGRESS', progress: baseProgress, text: `Connexion pour ${nomFichier}...` });
    
    const response = await fetch(url);
    const contentLength = response.headers.get('content-length');
    
    // Si le serveur ne renvoie pas la taille du fichier, on télécharge d'un coup
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

    // Lecture du flux de données
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        loaded += value.length;
        text += decoder.decode(value, { stream: true });
        
        // Calcul de la progression
        const percent = (loaded / total) * partDeProgression;
        const moLoaded = Math.round((loaded / 1024 / 1024) * 10) / 10;
        
        self.postMessage({ 
            type: 'PROGRESS', 
            progress: baseProgress + percent, 
            text: `Téléchargement ${nomFichier} (${moLoaded} Mo)...` 
        });
    }
    text += decoder.decode(); // Vide le buffer
    return text;
}

async function initChecker() {
    if (checker) return; // Si déjà chargé lors d'une précédente analyse

    const urlAff = "https://cdn.jsdelivr.net/gh/wooorm/dictionaries@main/dictionaries/fr/index.aff";
    const urlDic = "https://cdn.jsdelivr.net/gh/wooorm/dictionaries@main/dictionaries/fr/index.dic";
    
    // Le .aff pèse ~15Ko (on lui donne 5% de la jauge)
    const affData = await fetchWithProgress(urlAff, "des règles grammaticales", 0, 5);
    
    // Le .dic pèse ~4.5Mo (on lui donne 25% de la jauge)
    const dicData = await fetchWithProgress(urlDic, "du dictionnaire principal", 5, 25);

    self.postMessage({ type: 'PROGRESS', progress: 32, text: 'Construction du moteur (le navigateur va figer quelques secondes)...' });
    
    // Petite pause pour laisser le temps à l'interface de s'afficher avant que Typo.js ne gèle le Worker
    await new Promise(r => setTimeout(r, 150));
    
    checker = new Typo("fr_FR", affData, dicData);
}

self.onmessage = async function(e) {
    if (e.data.type === 'START') {
        // 1. Initialisation (prend 35% de la jauge globale)
        await initChecker();
        
        // 2. Analyse (prend les 65% restants)
        self.postMessage({ type: 'PROGRESS', progress: 35, text: 'Analyse du document en cours...' });
        await analyserTexte(e.data.payload);
    }
};

async function analyserTexte(text) {
    const motsBruts = text.split(/\s+/);
    const totalWords = motsBruts.length;
    let errors = [];
    
    const chunkSize = 500; 
    let processedWords = 0;

    for (let i = 0; i < totalWords; i += chunkSize) {
        const chunk = motsBruts.slice(i, i + chunkSize);
        
        chunk.forEach((motBrut, index) => {
            // 1. Nettoyage des extrémités (enlève les crochets, guillemets, virgules accrochés au début ou à la fin du mot)
            let motPropre = motBrut.replace(/^[.,!?()\[\]{};:«»"“”\-_]+|[.,!?()\[\]{};:«»"“”\-_]+$/g, '');
            
            // 2. Gestion de l'apostrophe française (ex: j'ai -> ai, l’idée -> idée)
            // Prend en charge l'apostrophe droite (') et typographique (’)
            motPropre = motPropre.replace(/^[ldjmntsctyqu]['’]/i, '');

            // Si le mot contient encore des caractères valides et n'est pas un nombre
            if (motPropre.length > 1 && isNaN(motPropre)) {
                
                // 3. Typo.js gère les majuscules. On teste le mot tel quel (pour "Excel"),
                // puis en minuscules (pour les mots en début de phrase).
                let estValide = checker.check(motPropre) || checker.check(motPropre.toLowerCase());

                // 4. Gestion des mots composés (ex: procédions-nous)
                if (!estValide && motPropre.includes('-')) {
                    const sousMots = motPropre.split('-');
                    // Le mot composé est valide si tous ses sous-mots le sont
                    estValide = sousMots.every(sm => sm.length <= 1 || checker.check(sm) || checker.check(sm.toLowerCase()));
                }

                // Si après tout ça, le mot n'est toujours pas valide, c'est une faute !
                if (!estValide) {
                    const globalIndex = i + index;
                    const contextStart = Math.max(0, globalIndex - 3);
                    const contextEnd = Math.min(totalWords, globalIndex + 4);
                    const context = motsBruts.slice(contextStart, contextEnd).join(' ');

                    errors.push({ word: motPropre, context: context }); // On affiche le mot nettoyé
                }
            }
        });

        processedWords += chunk.length;
        const progress = 35 + (processedWords / totalWords) * 65; 
        
        self.postMessage({ 
            type: 'PROGRESS', 
            progress: progress, 
            text: `Vérification : ${processedWords} mots sur ${totalWords}...` 
        });
    }

    self.postMessage({ type: 'DONE', errors: errors, totalWords: totalWords });
}
