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

// === COMMUNICATION AVEC LE WORKER ===
let startTime;

function startAnalysis(text) {
    startTime = Date.now();
    // NOUVEAU : On lit le localStorage (tableau vide par défaut)
    const customDict = JSON.parse(localStorage.getItem('user_custom_dict') || '[]');
    checkerWorker.postMessage({ type: 'START', payload: text, customDict: customDict });
}

checkerWorker.onmessage = function(e) {
    const { type, progress, text, errors, totalWords } = e.data;

    if (type === 'PROGRESS') {
        progressBar.style.width = `${progress}%`;
        progressPercentage.textContent = `${Math.round(progress)}%`;
        if (text) progressText.textContent = text; 
        
        const elapsed = (Date.now() - startTime) / 1000;
        if (progress > 5 && progress < 100) { 
            const totalEstimated = (elapsed / progress) * 100;
            const remaining = Math.round(totalEstimated - elapsed);
            timeEstimate.textContent = `Temps restant estimé : ${remaining} sec`;
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
