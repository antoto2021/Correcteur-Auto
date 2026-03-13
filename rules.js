// === MOTEUR DE RÈGLES GRAMMATICALES ET TYPOGRAPHIQUES ===

const grammarRules = [
    // --- RÈGLES DE TYPOGRAPHIE ---
    {
        id: "typo_espace_double",
        regex: / {2,}/g, // Cherche 2 espaces consécutifs ou plus
        message: "Espace multiple détecté.",
        type: "Typographie"
    },
    {
        id: "typo_ponctuation_double",
        // Cherche une lettre collée directement à une ponctuation double (sans espace)
        regex: /([a-zA-ZÀ-ÿ])([?:;!])/g, 
        message: "En français, il faut un espace avant une ponctuation double (?, !, :, ;).",
        type: "Typographie"
    },
    {
        id: "typo_virgule_espace",
        // Cherche une virgule suivie d'une lettre (sans espace)
        regex: /,([a-zA-ZÀ-ÿ])/g, 
        message: "Il faut un espace après une virgule.",
        type: "Typographie"
    },

    // --- RÈGLES DE GRAMMAIRE (Exemples de base) ---
    {
        id: "gram_sa_va",
        regex: /\b(sa va)\b/gi, // "sa va" en mot entier, insensible à la casse (i)
        message: "On écrit « ça va » (avec une cédille).",
        type: "Grammaire",
        suggestion: "ça va"
    },
    {
        id: "gram_a_le_matin",
        // Exemple d'erreur courante : "a" au lieu de "à" devant un mot spécifique
        regex: /\b(a le matin|a la maison)\b/gi, 
        message: "Attention, il s'agit probablement de la préposition « à » (avec accent).",
        type: "Grammaire"
    }
];
