// === MOTEUR DE RÈGLES GRAMMATICALES ET TYPOGRAPHIQUES ===

const grammarRules = [
    // --- 1. TYPOGRAPHIE ---
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
    // --- 1.5. TYPOGRAPHIE AVANCÉE ---
    {
        id: "typo_guillemets_ouverts",
        regex: /«([a-zA-ZÀ-ÿ])/g, 
        message: "Il faut une espace insécable après un guillemet ouvrant («).",
        type: "Typographie"
    },
    {
        id: "typo_guillemets_fermes",
        regex: /([a-zA-ZÀ-ÿ\.?!])»/g, 
        message: "Il faut une espace insécable avant un guillemet fermant (»).",
        type: "Typographie"
    },
    {
        id: "typo_espace_apostrophe",
        regex: /\s'/g, 
        message: "Il ne faut pas d'espace avant une apostrophe.",
        type: "Typographie"
    },
    {
        id: "typo_espace_apres_apostrophe",
        regex: /'\s/g, 
        message: "Il ne faut pas d'espace après une apostrophe.",
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
    // --- 2.5. CONFUSIONS COURANTES ET ORTHOGRAPHE ---
    {
        id: "gram_sa_va",
        regex: /\b(sa va|sa marche|sa fonctionne)\b/gi, 
        message: "Il faut utiliser le pronom démonstratif « ça » (avec une cédille).",
        type: "Grammaire"
    },
    {
        id: "gram_quand_quant",
        regex: /\b(quand a|quand à|quand au|quand aux)\b/gi, 
        message: "Lorsqu'on peut remplacer par 'en ce qui concerne', on écrit « quant » (avec un t).",
        type: "Grammaire"
    },
    {
        id: "gram_un_peut",
        regex: /\b(un peut)\b/gi, 
        message: "Le nom ou l'adverbe s'écrit « peu » (avec un t, c'est le verbe pouvoir).",
        type: "Grammaire"
    },
    {
        id: "gram_a_t_il",
        regex: /\b(a t'il|a-t'il|a t il)\b/gi, 
        message: "La forme correcte est « a-t-il » (avec des traits d'union, pas d'apostrophe).",
        type: "Typographie/Grammaire"
    },
    {
        id: "gram_ces_ses",
        regex: /\b(c'est affaires|c'est mots|c'est choses)\b/gi, 
        message: "Ne pas confondre 'c'est' (cela est) avec le démonstratif 'ces' ou le possessif 'ses'.",
        type: "Grammaire"
    },

    // --- 3. RÈGLES VERBALES DE BASE ---
    {
        id: "gram_apres_avoir_etre",
        // CORRECTION : On remplace le \b final par (?![a-zA-ZÀ-ÿ]) pour gérer les accents
        regex: /\b(après avoir|après être)\s+([a-zA-ZÀ-ÿ]+er)(?![a-zA-ZÀ-ÿ])/gi, 
        message: "Après 'avoir' ou 'être', le verbe se met au participe passé (-é, -i, -u), pas à l'infinitif (-er).",
        type: "Grammaire"
    },
    {
        id: "gram_sans_infinitif",
        // CORRECTION ICI AUSSI
        regex: /\b(sans|pour|afin de|avant de)\s+([a-zA-ZÀ-ÿ]+é)(?![a-zA-ZÀ-ÿ])/gi, 
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
    // --- 4.5. EXPRESSIONS FIGÉES (Niveau supérieur) ---
    {
        id: "exp_comme_meme",
        regex: /\b(comme même)\b/gi, 
        message: "L'expression correcte est « quand même ».",
        type: "Orthographe"
    },
    {
        id: "exp_pallier_a",
        regex: /\b(pallier à|palliant à)\b/gi, 
        message: "Le verbe 'pallier' est transitif direct : on pallie quelque chose, on ne pallie pas 'à' quelque chose.",
        type: "Grammaire"
    },
    {
        id: "exp_en_terme_de",
        regex: /\b(en terme de)\b/gi, 
        message: "L'expression s'écrit toujours au pluriel : « en termes de ».",
        type: "Orthographe"
    },
    {
        id: "exp_a_l_attention_de",
        regex: /\b(à l'intention de (Monsieur|Madame|M\.|Mme|la direction))\b/gi, 
        message: "En haut d'un courrier/mail, on écrit « à l'attention de » (pour attirer l'attention). 'À l'intention de' signifie 'pour faire plaisir à'.",
        type: "Vocabulaire"
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
    },
    // --- 5.5. PLÉONASMES SUPPLÉMENTAIRES ---
    {
        id: "style_pleonasme_reserver",
        regex: /\b(réserver à l'avance|réservé à l'avance)\b/gi, 
        message: "C'est un pléonasme. Une réservation se fait toujours à l'avance. « Réserver » suffit.",
        type: "Style"
    },
    {
        id: "style_pleonasme_collaborer",
        regex: /\b(collaborer ensemble)\b/gi, 
        message: "C'est un pléonasme. « Collaborer » signifie déjà travailler ensemble.",
        type: "Style"
    },
    {
        id: "style_pleonasme_ajouter",
        regex: /\b(ajouter en plus)\b/gi, 
        message: "C'est un pléonasme. « Ajouter » suffit.",
        type: "Style"
    },
    // --- 6. RÉFORME ORTHOGRAPHIQUE DE 1990 ---
    {
        id: "reforme_1990_circonflexe_i",
        // Liste des mots courants perdant leur accent sur le i
        regex: /\b(maitre|maitres|maitresse|maitresses|boite|boites|chaine|chaines|connaitre|paraitre|s'il vous plait|huitre|huitres|entrainer|entrainement|entrainements)\b/gi,
        message: "Réforme de 1990 : l'accent circonflexe sur le 'i' n'est plus obligatoire. Cette orthographe est juste, mais la forme traditionnelle (maître, boîte, connaître...) est souvent exigée dans un cadre formel. À vous de choisir votre convention.",
        type: "Réforme 1990"
    },
    {
        id: "reforme_1990_circonflexe_u",
        // Liste des mots courants perdant leur accent sur le u
        regex: /\b(cout|couts|gout|gouts|aout)\b/gi,
        message: "Réforme de 1990 : l'accent circonflexe sur le 'u' n'est plus obligatoire (sauf pour mûr/mur, dû/du, etc.). L'orthographe est tolérée, mais la forme traditionnelle (coût, goût, août) reste recommandée.",
        type: "Réforme 1990"
    }
];

// === DICTIONNAIRE PERSONNEL (Whitelist) ===
// Tous les mots en minuscules ici. Ils ne seront jamais signalés comme fautes d'orthographe.
const dictionnairePersonnel = new Set([
    // Vos mots techniques actuels
    "bdd", "api", "pdf", "docx", "appli", "github", "rh", "manager", "feedback", 
    "excel", "startup", "web", "email", "mail", "newsletter", "workflow", "process",
    "saas", "cloud", "ui", "ux", "frontend", "backend", "dashboard", "deadline", "debug", 
    "roadmap", "freelance", "sprint", "agile", "scrum", "lead", "onboarding", "call", "meeting", 
    "brainstorming", "brief", "débrief", "manager", "management", "open-source", "plugin", "setup",
    
    // NOUVEAU : Mots de la réforme 1990 pour éviter l'erreur "rouge" d'orthographe
    "maitre", "maitres", "maitresse", "maitresses", "boite", "boites", "chaine", "chaines", 
    "connaitre", "paraitre", "plait", "huitre", "huitres", "entrainer", "entrainement", 
    "entrainements", "cout", "couts", "gout", "gouts", "aout"
]);
