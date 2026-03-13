// === MOTEUR DE RÈGLES GRAMMATICALES ET TYPOGRAPHIQUES ===

const grammarRules = [
    // --- 1. TYPOGRAPHIE ---
[
    {
        id: "typo_espace_double",
        regex: / {2,}/g, // Cherche 2 espaces consécutifs ou plus
        message: "Espace multiple détecté.",
        type: "Typographie"
    },
    {
        id: "typo_ponctuation_double",
        regex: /([a-zA-ZÀ-ÿ])([?:;!])/g, 
        message: "En français, il faut un espace avant une ponctuation double (?, !, :, ;).",
        type: "Typographie"
    },
    {
        id: "typo_virgule_espace",
        regex: /,([a-zA-ZÀ-ÿ])/g, 
        message: "Il faut un espace après une virgule.",
        type: "Typographie"
    },
    {
        id: "typo_espace_avant_virgule",
        regex: /\s+,/g, 
        message: "Il ne faut pas d'espace avant une virgule ou un point.",
        type: "Typographie"
    },
    {
        id: "typo_points_suspension",
        regex: /(?<!\.)\.\.(?!\.)/g, // Trouve 2 points, mais pas 3
        message: "Les points de suspension vont par trois (...).",
        type: "Typographie"
    },

    // --- 2. CONFUSIONS COURANTES (Homophones) ---
    {
        id: "gram_a_au_lieu_de_à",
        // Cherche "a" précédé de mots qui exigent généralement "à"
        regex: /\b(face a|grâce a|par rapport a|jusqu'a|quant a|pas a pas|tout a fait)\b/gi, 
        message: "Il faut probablement utiliser la préposition « à » (avec accent).",
        type: "Grammaire"
    },
    {
        id: "gram_ou_où",
        regex: /\b(au moment ou|la ou|dans le cas ou|jusqu'ou)\b/gi, 
        message: "Il faut utiliser « où » (avec accent) pour marquer le lieu ou le temps.",
        type: "Grammaire"
    },
    {
        id: "gram_ce_se",
        regex: /\b(ce faire|ce dire|ce mettre|ce rendre)\b/gi, 
        message: "Devant un verbe à l'infinitif, on utilise le pronom réfléchi « se » (ex: se faire).",
        type: "Grammaire"
    },
    {
        id: "gram_s_est_c_est",
        regex: /\b(s'est dommage|s'est bien|s'est faux|s'est vrai|s'est clair)\b/gi, 
        message: "Pour présenter quelque chose, on utilise « c'est » (ex: c'est dommage).",
        type: "Grammaire"
    },
    {
        id: "gram_son_sont",
        regex: /\b(ils son|elles son)\b/gi, 
        message: "Il s'agit du verbe être : « sont ».",
        type: "Grammaire"
    },

    // --- 3. RÈGLES VERBALES DE BASE ---
    {
        id: "gram_apres_avoir_etre",
        // Cherche "avoir/être" suivi d'un mot se terminant par "er" (infinitif)
        regex: /\b(après avoir|après être) ([a-zA-ZÀ-ÿ]+er)\b/gi, 
        message: "Après 'avoir' ou 'être', le verbe se met au participe passé (-é, -i, -u), pas à l'infinitif (-er).",
        type: "Grammaire"
    },
    {
        id: "gram_sans_infinitif",
        // Cherche une préposition suivie d'un mot se terminant par "é" (participe)
        regex: /\b(sans|pour|afin de|avant de) ([a-zA-ZÀ-ÿ]+é)\b/gi, 
        message: "Après une préposition (sans, pour, de...), le verbe se met à l'infinitif (-er).",
        type: "Grammaire"
    },

    // --- 4. EXPRESSIONS FIGÉES (Erreurs fréquentes) ---
    {
        id: "gram_par_mis",
        regex: /\b(par mis)\b/gi, 
        message: "On écrit toujours « parmi » (en un seul mot, sans 's').",
        type: "Grammaire"
    },
    {
        id: "gram_malgres",
        regex: /\b(malgrès|malgrer)\b/gi, 
        message: "On écrit toujours « malgré » (sans 's' final ni 'er').",
        type: "Grammaire"
    },
    {
        id: "gram_quelque_soit",
        regex: /\b(quelque soit)\b/gi, 
        message: "Sauf s'il est suivi d'un nom, on écrit « quel que soit » (en deux ou trois mots selon l'accord).",
        type: "Grammaire"
    },
    {
        id: "gram_tord",
        regex: /\b(avoir tord|a tord|ont tord)\b/gi, 
        message: "Le contraire de la raison est le « tort » (avec un 't'). Le « tord » est le verbe tordre.",
        type: "Grammaire"
    },

    // --- 5. PLÉONASMES ET MALADRESSES (Style) ---
    {
        id: "style_pleonasme_aujourdhui",
        regex: /\b(au jour d'aujourd'hui)\b/gi, 
        message: "C'est un pléonasme. « Aujourd'hui » ou « de nos jours » suffit.",
        type: "Style"
    },
    {
        id: "style_pleonasme_voire_meme",
        regex: /\b(voire même)\b/gi, 
        message: "C'est un pléonasme. « Voire » signifie déjà « et même ».",
        type: "Style"
    },
    {
        id: "style_pleonasme_monter",
        regex: /\b(monter en haut|descendre en bas)\b/gi, 
        message: "C'est un pléonasme. Le verbe se suffit à lui-même.",
        type: "Style"
    }
];

// === DICTIONNAIRE PERSONNEL (Whitelist) ===
// Tous les mots en minuscules ici. Ils ne seront jamais signalés comme fautes d'orthographe.
const dictionnairePersonnel = new Set([
    "bdd", "api", "pdf", "docx", "appli", "github", "rh", "manager", "feedback", 
    "excel", "startup", "web", "email", "mail", "newsletter", "workflow", "process",
    "saas", "cloud", "ui", "ux", "frontend", "backend" // J'ai ajouté un peu de vocabulaire tech classique
]);
