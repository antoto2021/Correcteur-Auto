// === CONFIGURATION GITHUB ===
const GITHUB_USER = "antoto2021"; // EX: "octocat"
const GITHUB_REPO = "Correcteur-Auto";           // EX: "correcteur-local"
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/commits/main`;

// === ÉLÉMENTS DU DOM ===
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const progressText = document.getElementById('progress-text'); // Ajout de la référence au texte
const timeEstimate = document.getElementById('time-estimate');
const resultsSection = document.getElementById('results-section');
const errorList = document.getElementById('error-list');
const errorCountEl = document.getElementById('error-count');
const wordCountEl = document.getElementById('word-count');
const resetBtn = document.getElementById('reset-btn');

// === ÉLÉMENTS VERSIONING ET BOUTONS ===
const infoBtnOpen = document.getElementById('info-btn-open');
const versionPanelFull = document.getElementById('version-panel-full');
const localVersionHashEl = document.getElementById('local-version-hash');
const localUpdateTimeEl = document.getElementById('local-update-time');
const githubVersionHashEl = document.getElementById('github-version-hash');
const versionVerifyBtn = document.getElementById('version-verify-btn');
const appRefreshBtnContainer = document.getElementById('app-refresh-btn');

const checkerWorker = new Worker('worker.js');
let latestGithubHash = null; // Stocke le hash en attente d'installation

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
    versionVerifyBtn.onclick = checkVersion; // Par défaut, le clic revérifie
    
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
            // NOUVELLE VERSION DISPO : On change le comportement du bouton
            versionVerifyBtn.textContent = "🔄 Nouvelle version ! Installer maintenant ?";
            versionVerifyBtn.classList.replace('btn-primary', 'btn-secondary');
            appRefreshBtnContainer.classList.remove('hidden'); 
            
            // CORRECTION : On sauvegarde le hash AU CLIC
            const installUpdate = () => {
                localStorage.setItem('app_version_hash', latestGithubHash);
                window.location.reload(true);
            };
            versionVerifyBtn.onclick = installUpdate;
            appRefreshBtnContainer.onclick = installUpdate;

        } else {
            // À JOUR
            versionVerifyBtn.textContent = "🔄 À jour. Vérifier maintenant";
            versionVerifyBtn.classList.replace('btn-secondary', 'btn-primary');
        }
    } catch (error) {
        versionVerifyBtn.textContent = "❌ Erreur de vérification";
    }
}

// === GESTION DE L'INTERFACE (DRAG & DROP) ===
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

resetBtn.addEventListener('click', () => {
    resultsSection.classList.add('hidden');
    dropZone.classList.remove('hidden');
    fileInput.value = "";
    errorList.innerHTML = "";
});

// === LECTURE DES FICHIERS ===
async function handleFile(file) {
    dropZone.classList.add('hidden');
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
    checkerWorker.postMessage({ type: 'START', payload: text });
}

checkerWorker.onmessage = function(e) {
    const { type, progress, text, errors, totalWords } = e.data;

    if (type === 'PROGRESS') {
        progressBar.style.width = `${progress}%`;
        progressPercentage.textContent = `${Math.round(progress)}%`;
        if (text) progressText.textContent = text; // Met à jour le texte dynamiquement
        
        const elapsed = (Date.now() - startTime) / 1000;
        if (progress > 5 && progress < 100) { // On commence l'estimation après un peu de chargement
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

function displayResults(errors, totalWords) {
    wordCountEl.textContent = totalWords;
    errorCountEl.textContent = errors.length;
    if (errors.length === 0) {
        errorList.innerHTML = "<p>Aucune faute détectée ! 🎉</p>";
        return;
    }
    errors.forEach(err => {
        const div = document.createElement('div');
        div.className = 'error-item';
        div.innerHTML = `<strong>${err.word}</strong> - <span class="error-context">...${err.context}...</span>`;
        errorList.appendChild(div);
    });
}
