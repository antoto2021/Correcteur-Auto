// === CONFIGURATION GITHUB ===
const GITHUB_USER = "antoto2021"; 
const GITHUB_REPO = "Correcteur-Auto";           
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/commits/main`;

// === ÉLÉMENTS DU DOM ===
const inputSection = document.getElementById('input-section'); // La nouvelle section globale
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const textInput = document.getElementById('text-input'); // La nouvelle zone de texte
const analyzeTextBtn = document.getElementById('analyze-text-btn'); // Le nouveau bouton

const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const progressText = document.getElementById('progress-text'); 
const timeEstimate = document.getElementById('time-estimate');
const resultsSection = document.getElementById('results-section');
const errorList = document.getElementById('error-list');
const globalScoreEl = document.getElementById('global-score');
const orthoCountEl = document.getElementById('ortho-count');
const gramCountEl = document.getElementById('gram-count');
const wordCountEl = document.getElementById('word-count');
const resetBtn = document.getElementById('reset-btn');

// === ÉLÉMENTS VERSIONING ===
const infoBtnOpen = document.getElementById('info-btn-open');
const versionPanelFull = document.getElementById('version-panel-full');
const localVersionHashEl = document.getElementById('local-version-hash');
const localUpdateTimeEl = document.getElementById('local-update-time');
const githubVersionHashEl = document.getElementById('github-version-hash');
const versionVerifyBtn = document.getElementById('version-verify-btn');
const appRefreshBtnContainer = document.getElementById('app-refresh-btn');

const checkerWorker = new Worker('worker.js');
let latestGithubHash = null;

// === NOUVEAUX ÉLÉMENTS DU DOM (IA V2) ===
const iaSetupBtn = document.getElementById('ia-setup-btn');
const iaStatus = document.getElementById('ia-status');
const iaModal = document.getElementById('ia-modal');
const closeModalBtn = document.getElementById('close-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const apiValidationMsg = document.getElementById('api-validation-msg');

// Variable globale pour stocker le modèle IA sélectionné et la clé
let activeAiModel = null;
let savedApiKey = null;

// === GESTION DE LA POP-UP (MODAL IA) ===

// Ouvrir le modal
iaSetupBtn.addEventListener('click', () => {
    iaModal.classList.remove('hidden');
    // Si une clé existe déjà, on l'affiche dans le champ
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) apiKeyInput.value = storedKey;
});

// Fermer le modal via la croix
closeModalBtn.addEventListener('click', () => {
    iaModal.classList.add('hidden');
    apiValidationMsg.textContent = ""; 
});

// Fermer le modal en cliquant dans le vide (autour de la boite)
window.addEventListener('click', (e) => {
    if (e.target === iaModal) {
        iaModal.classList.add('hidden');
        apiValidationMsg.textContent = "";
    }
});

// === VALIDATION DE LA CLÉ API GEMINI ===
saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        apiValidationMsg.textContent = "Veuillez entrer une clé API.";
        apiValidationMsg.style.color = "var(--error-color)";
        return;
    }

    apiValidationMsg.textContent = "Vérification des modèles disponibles... ⏳";
    apiValidationMsg.style.color = "var(--text-main)";
    saveApiKeyBtn.disabled = true;

    try {
        // Requête officielle à l'API Google pour lister les modèles (sert de test de validation)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (!response.ok) {
            throw new Error("Clé API invalide ou bloquée.");
        }

        const data = await response.json();
        
        // 2. Vérification des modèles disponibles : on cherche en priorité la famille "flash" (très rapide)
        // On cherche gemini-2.5-flash, sinon 1.5-flash, sinon on prend le premier modèle textuel.
        const flashModel = data.models.find(m => m.name.includes('gemini-2.5-flash') || m.name.includes('gemini-1.5-flash')) || data.models.find(m => m.name.includes('gemini'));
        
        if (flashModel) {
            // Succès !
            activeAiModel = flashModel.name.replace('models/', ''); // On nettoie le nom (ex: "gemini-2.5-flash")
            savedApiKey = apiKey;
            localStorage.setItem('gemini_api_key', apiKey); // Sauvegarde dans le navigateur
            
            // Mise à jour visuelle de l'interface
            iaStatus.textContent = `🟢 ${activeAiModel}`;
            iaStatus.classList.add('text-success');
            iaSetupBtn.classList.add('active');
            
            // Message de succès et fermeture du modal après 1.5s
            apiValidationMsg.textContent = "Clé validée ! Modèle connecté avec succès. ✅";
            apiValidationMsg.style.color = "var(--success-color)";
            setTimeout(() => {
                iaModal.classList.add('hidden');
                apiValidationMsg.textContent = "";
                saveApiKeyBtn.disabled = false;
            }, 1500);
        } else {
            throw new Error("Aucun modèle de texte compatible trouvé.");
        }

    } catch (error) {
        // En cas d'erreur (mauvaise clé ou pas d'internet)
        apiValidationMsg.textContent = "❌ " + error.message;
        apiValidationMsg.style.color = "var(--error-color)";
        saveApiKeyBtn.disabled = false;
        
        // On remet l'interface à zéro
        iaStatus.textContent = "❌ Non configurée";
        iaStatus.classList.remove('text-success');
        iaSetupBtn.classList.remove('active');
        localStorage.removeItem('gemini_api_key');
        activeAiModel = null;
        savedApiKey = null;
    }
});

// === VÉRIFICATION AUTOMATIQUE AU DÉMARRAGE ===
// Si l'utilisateur revient le lendemain, on vérifie sa clé silencieusement
window.addEventListener('DOMContentLoaded', () => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
        apiKeyInput.value = storedKey;
        // On déclenche un faux clic discret pour valider le modèle en arrière-plan
        saveApiKeyBtn.click(); 
        iaModal.classList.add('hidden'); // On s'assure que le modal ne saute pas à l'écran
    }
});

// === GESTION DU VERSIONING ===
infoBtnOpen.addEventListener('click', () => {
    versionPanelFull.classList.toggle('hidden');
    if (!versionPanelFull.classList.contains('hidden')) checkVersion();
});

window.addEventListener('click', (e) => {
    if (e.target !== versionPanelFull && !versionPanelFull.contains(e.target) && e.target !== infoBtnOpen) {
        versionPanelFull.classList.add('hidden');
    }
});

async function checkVersion() {
    appRefreshBtnContainer.classList.add('hidden');
    versionVerifyBtn.textContent = "🔄 Vérification...";
    versionVerifyBtn.onclick = checkVersion; 
    
    try {
        const response = await fetch(GITHUB_API_URL);
        if (!response.ok) throw new Error("Dépôt introuvable");
        const data = await response.json();
        
        latestGithubHash = data.sha.substring(0, 7); 
        const localHash = localStorage.getItem('app_version_hash');

        githubVersionHashEl.textContent = `Commit: ${latestGithubHash}`;
        
        if (!localHash) {
            localVersionHashEl.textContent = "Non installée";
            localUpdateTimeEl.textContent = "Première utilisation";
        } else {
            localVersionHashEl.textContent = localHash;
            localUpdateTimeEl.textContent = "Mise à jour : installée";
        }

        if (!localHash || localHash !== latestGithubHash) {
            versionVerifyBtn.textContent = "🔄 Nouvelle version ! Installer maintenant ?";
            versionVerifyBtn.classList.replace('btn-primary', 'btn-secondary');
            appRefreshBtnContainer.classList.remove('hidden'); 
            
            const installUpdate = () => {
                localStorage.setItem('app_version_hash', latestGithubHash);
                window.location.reload(true);
            };
            versionVerifyBtn.onclick = installUpdate;
            appRefreshBtnContainer.onclick = installUpdate;

        } else {
            versionVerifyBtn.textContent = "🔄 À jour. Vérifier maintenant";
            versionVerifyBtn.classList.replace('btn-secondary', 'btn-primary');
        }
    } catch (error) {
        versionVerifyBtn.textContent = "❌ Erreur de vérification";
    }
}

// === GESTION DE L'INTERFACE (DRAG & DROP ET TEXTE) ===

// 1. Analyse depuis la zone de texte
analyzeTextBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text) {
        inputSection.classList.add('hidden');
        progressSection.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
        progressText.textContent = 'Préparation du texte...';
        startAnalysis(text);
    } else {
        alert("Veuillez entrer du texte à analyser.");
    }
});

// 2. Analyse depuis un fichier
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

// Bouton de réinitialisation
resetBtn.addEventListener('click', () => {
    resultsSection.classList.add('hidden');
    inputSection.classList.remove('hidden'); // On réaffiche la section globale
    fileInput.value = "";
    textInput.value = ""; // On vide la zone de texte
    errorList.innerHTML = "";
});

// === LECTURE DES FICHIERS ===
async function handleFile(file) {
    inputSection.classList.add('hidden'); // On cache toute la section d'entrée
    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressPercentage.textContent = '0%';
    progressText.textContent = 'Extraction du texte...';
    
    let text = "";
    try {
        if (file.name.endsWith('.txt')) {
            text = await file.text();
        } else if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            text = result.value;
        } else if (file.name.endsWith('.pdf')) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + "\n";
            }
        } else {
            throw new Error("Format non supporté.");
        }
        startAnalysis(text);
    } catch (error) {
        alert("Erreur : " + error.message);
        resetBtn.click();
    }
}

// === AIGUILLAGE DE L'ANALYSE (LOCAL OU IA) ===
let startTime;

async function startAnalysis(text) {
    startTime = Date.now();
    
    // Si l'IA est configurée, on l'utilise
    if (activeAiModel && savedApiKey) {
        progressText.textContent = `Préparation du modèle ${activeAiModel}...`;
        await analyzeWithGemini(text);
    } 
    // Sinon, on lance le Worker local historique
    else {
        const customDict = JSON.parse(localStorage.getItem('user_custom_dict') || '[]');
        checkerWorker.postMessage({ type: 'START', payload: text, customDict: customDict });
    }
}

// === ANALYSE VIA L'API GEMINI (V2 AVEC FALLBACK INTELLIGENT) ===
async function analyzeWithGemini(text) {
    const totalWords = text.split(/\s+/).filter(m => m.trim().length > 0).length;
    let allErrors = [];

    progressBar.style.width = '20%';
    progressPercentage.textContent = '20%';
    timeEstimate.textContent = "Analyse contextuelle profonde en cours...";

    // 1. CORRECTION DU BUG : Définition propre des variables du dictionnaire
    const customDict = JSON.parse(localStorage.getItem('user_custom_dict') || '[]');
    const dictInstruction = customDict.length > 0 
        ? `- IGNORE STRICTEMENT les mots techniques, sigles ou jargons suivants : ${customDict.join(', ')}.` 
        : '';

    // 2. Préparation du Prompt
    const prompt = `Agis en tant que correcteur professionnel français (orthographe, grammaire, typographie, style).
    Analyse le texte suivant et retourne un tableau JSON contenant les erreurs.
    Format exact attendu pour chaque objet du tableau :
    {
      "word": "le mot exact ou l'expression qui pose problème",
      "context": "la phrase contenant l'erreur",
      "type": "Grammaire", 
      "message": "Explication claire de la faute et proposition de correction."
    }
    Règles :
    - Le "type" doit STRICTEMENT être parmi : "Orthographe", "Grammaire", "Typographie", "Style".
    - Ne signale pas l'absence d'accent circonflexe comme une faute si c'est toléré par la réforme de 1990 (ex: maitre, cout).
    ${dictInstruction}
    - Si aucune faute n'est trouvée, retourne un tableau vide [].
    - Ne retourne RIEN D'AUTRE que le JSON valide.

    TEXTE À ANALYSER :
    ${text}`;

    // 3. VOTRE IDÉE : Liste des modèles à tester en cascade
    // On met le modèle choisi par l'utilisateur en premier, puis on ajoute des roues de secours
    const modelsToTry = [activeAiModel, 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let success = false;

    // 4. Boucle de test des modèles
    for (const model of modelsToTry) {
        if (!model) continue; // Sécurité si un modèle est vide
        
        try {
            progressText.textContent = `Envoi au modèle ${model}...`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${savedApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" } // Force le format JSON
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur API (Code: ${response.status})`);
            }

            // Si ça passe, on met à jour la jauge !
            progressBar.style.width = '80%';
            progressPercentage.textContent = '80%';
            progressText.textContent = `Lecture des résultats de l'IA (${model})...`;

            const data = await response.json();
            const responseText = data.candidates[0].content.parts[0].text;
            
            allErrors = JSON.parse(responseText);
            success = true; // On valide le succès
            break; // LE MODÈLE A FONCTIONNÉ, ON SORT DE LA BOUCLE !

        } catch (err) {
            console.warn(`Échec avec le modèle ${model} :`, err.message);
            progressText.textContent = `Échec de ${model}, test du modèle suivant...`;
            // La boucle continue automatiquement et teste le modèle suivant
        }
    }

    // 5. Affichage des résultats OU Bascule sur le local
    if (success) {
        progressBar.style.width = '100%';
        progressPercentage.textContent = '100%';
        progressText.textContent = 'Analyse terminée !';
        timeEstimate.textContent = "";

        setTimeout(() => {
            progressSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            displayResults(allErrors, totalWords); 
        }, 800);
    } else {
        // Ultime recours : Aucun modèle IA n'a répondu
        alert("Les serveurs IA sont inaccessibles ou votre quota est dépassé.\n\nBascule automatique sur le correcteur local (100% hors-ligne).");
        checkerWorker.postMessage({ type: 'START', payload: text, customDict: customDict });
    }
}

checkerWorker.onmessage = function(e) {
    const { type, progress, text, errors, totalWords } = e.data;

    if (type === 'PROGRESS') {
        progressBar.style.width = `${progress}%`;
        progressPercentage.textContent = `${Math.round(progress)}%`;
        if (text) progressText.textContent = text; 
        
        const elapsed = (Date.now() - startTime) / 1000;
        
        // CORRECTION DE L'ESTIMATION DU TEMPS
        if (progress > 5 && progress < 100) { 
            if (progress === 32) {
                // Typo.js est en train de geler le Worker
                timeEstimate.textContent = "Traitement des données linguistiques...";
            } else {
                const totalEstimated = (elapsed / progress) * 100;
                const remaining = Math.max(1, Math.round(totalEstimated - elapsed)); // Empêche d'afficher 0 sec
                timeEstimate.textContent = `Temps restant estimé : ~${remaining} sec`;
            }
        }
    }
    else if (type === 'DONE') {
        progressSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        displayResults(errors, totalWords);
    }
};

// === FONCTION UTILITAIRE POUR ÉVITER LES BUGS D'AFFICHAGE ===
// Protège les caractères spéciaux (comme les chevrons < >) pour ne pas casser l'HTML
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

// Protège le mot recherché pour qu'il soit bien interprété par la Regex de surlignage
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function displayResults(errors, totalWords) {
    wordCountEl.textContent = `${totalWords} mots analysés`;
    
    // --- CALCUL DES SCORES ---
    const orthoErrors = errors.filter(e => e.type === "Orthographe").length;
    const gramErrors = errors.length - orthoErrors; // Tout le reste (Grammaire, Typo, Style)
    
    // Le score global est un pourcentage de "mots corrects"
    let noteGlobale = 100;
    if (totalWords > 0) {
        // Formule : on retire les fautes du total, et on calcule le pourcentage
        noteGlobale = Math.max(0, Math.round(((totalWords - errors.length) / totalWords) * 100));
    }

    // Affichage des compteurs
    orthoCountEl.textContent = orthoErrors;
    gramCountEl.textContent = gramErrors;
    globalScoreEl.textContent = `${noteGlobale}%`;

    // Couleur dynamique du score global
    globalScoreEl.className = ""; // Reset
    if (noteGlobale >= 95) globalScoreEl.classList.add('score-success');
    else if (noteGlobale >= 80) globalScoreEl.classList.add('score-warning');
    else globalScoreEl.classList.add('score-danger');

    // --- AFFICHAGE DES ERREURS ---
    errorList.innerHTML = ""; // On vide la liste
    
    if (errors.length === 0) {
        errorList.innerHTML = "<p style='text-align:center; padding: 20px;'>Aucune faute détectée ! Votre texte est impeccable. 🎉</p>";
        return;
    }
    
    errors.forEach(err => {
        const div = document.createElement('div');
        div.className = 'error-item';
        
        let typeColor = "#6B7280"; 
        if (err.type === "Typographie") typeColor = "#3B82F6"; 
        if (err.type === "Grammaire") typeColor = "#F59E0B"; 
        if (err.type === "Style") typeColor = "#8B5CF6";
        // NOUVELLE COULEUR : Un orange bien vif pour la réforme orthographique
        if (err.type === "Réforme 1990") typeColor = "#F97316";

        const safeContext = escapeHTML(err.context);
        const searchRegex = new RegExp(`(${escapeRegExp(err.word)})`, 'g'); 
        const highlightedContext = safeContext.replace(searchRegex, `<span class="highlight-error-word">$1</span>`);

        // NOUVEAU : Le bouton n'apparaît que pour l'orthographe
        let addDictButtonHTML = "";
        if (err.type === "Orthographe") {
            // On passe le mot en paramètre à notre nouvelle fonction
            addDictButtonHTML = `<button class="btn-add-dict" onclick="addToDictionary('${escapeHTML(err.word)}', this)">➕ Ignorer et Ajouter</button>`;
        }

        div.innerHTML = `
            <div class="error-header">
                <div>
                    <span style="background-color: ${typeColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 5px;">
                        ${err.type}
                    </span>
                    <strong style="font-size: 16px;">${escapeHTML(err.word)}</strong>
                </div>
                ${addDictButtonHTML}
            </div>
            
            <div class="error-context">${highlightedContext}</div>
            
            <div style="font-size: 13px; color: #4B5563; margin-top: 6px;">
                💡 <em>${err.message}</em>
            </div>
        `;
        errorList.appendChild(div);
    });

// === FONCTION D'AJOUT AU DICTIONNAIRE PERSONNEL ===
window.addToDictionary = function(word, btnElement) {
    // 1. Sauvegarde dans le LocalStorage
    let dict = JSON.parse(localStorage.getItem('user_custom_dict') || '[]');
    if (!dict.includes(word.toLowerCase())) {
        dict.push(word.toLowerCase());
        localStorage.setItem('user_custom_dict', JSON.stringify(dict));
    }

    // 2. Disparition visuelle (UX fluide)
    const errorItem = btnElement.closest('.error-item');
    errorItem.style.opacity = '0';
    setTimeout(() => {
        errorItem.remove();
        
        // 3. Mise à jour du compteur d'orthographe (bonus visuel)
        const orthoCountEl = document.getElementById('ortho-count');
        const currentCount = parseInt(orthoCountEl.textContent);
        if (currentCount > 0) orthoCountEl.textContent = currentCount - 1;
        
        // (Le score global sur 100% se mettra à jour lors de la prochaine analyse)
    }, 300);
};
    
}
