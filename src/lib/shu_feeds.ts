// Publications ADE manuelles (liens ".shu"), UNE PAR SALLE.
//
// Contexte : l'endpoint anonyme historique (anonymous_cal.jsp) de
// planning.univ-rennes.fr renvoie un corps vide depuis la migration
// "univ-rennes1" -> "univ-rennes". En attendant sa réactivation côté DSI,
// les salles prioritaires sont alimentées une par une via des publications
// ADE générées à la main.
//
// Contraintes vérifiées :
// - Un lien ".shu" ne fonctionne que pour UNE SEULE salle : avec plusieurs
//   salles cochées, ADE génère un lien qui ne renvoie rien d'exploitable.
//   Ne mettre ici que des liens par salle.
// - Ces URL restent strictement côté serveur (load functions SSR) : elles ne
//   sont jamais envoyées au navigateur, seuls les événements parsés le sont.
// - À renouveler si ADE les invalide (rentrée, migration, etc.).
// - Les salles SANS entrée ci-dessous retombent sur l'ancien endpoint
//   anonyme (repli automatique, aujourd'hui vide mais sans crash).

export type ShuFeed = {
    university: string;
    building: string;
    room: string;
    url: string;
};

export const SHU_FEEDS: ShuFeed[] = [
    // Bâtiment 41
    {
        university: "Université de Rennes",
        building: "Bâtiment 41",
        room: "001",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/zWoMm8YM.shu",
    },
    {
        university: "Université de Rennes",
        building: "Bâtiment 41",
        room: "002",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/KYggRLYJ.shu",
    },
    {
        university: "Université de Rennes",
        building: "Bâtiment 41",
        room: "003",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/ZYj6ykYB.shu",
    },
    {
        university: "Université de Rennes",
        building: "Bâtiment 41",
        room: "004",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/9WOG6vWP.shu",
    },
    {
        university: "Université de Rennes",
        building: "Bâtiment 41",
        room: "101",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/o3JKMOYr.shu",
    },
    {
        university: "Université de Rennes",
        building: "Bâtiment 41",
        room: "102",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/2YXqZlnD.shu",
    },
    {
        university: "Université de Rennes",
        building: "Bâtiment 41",
        room: "103",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/EYlpQlYa.shu",
    },
    {
        university: "Université de Rennes",
        building: "Bâtiment 41",
        room: "104",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/rYBp9BWx.shu",
    },
    // Bâtiment 42
    {
        university: "Université de Rennes",
        building: "Bâtiment 42",
        room: "Amphi L",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/pn8My5W8.shu",
    },
    {
        university: "Université de Rennes",
        building: "Bâtiment 42",
        room: "Amphi M",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/rY6ywb3z.shu",
    },
    {
        university: "Université de Rennes",
        building: "Bâtiment 42",
        room: "Amphi N",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/zWoMk7YM.shu",
    },
    // Bâtiment 41B
    {
        university: "Université de Rennes",
        building: "Bâtiment 41B",
        room: "Salle de réunion",
        url: "https://planning.univ-rennes.fr/jsp/custom/modules/plannings/9n9LybYP.shu",
    },

    // TODO: ajouter les autres salles prioritaires (une entrée par salle).
];

// Bâtiments masqués de la page des salles (non couverts par des publications
// et sans endpoint anonyme fonctionnel : les afficher vides n'apporte rien).
export const HIDDEN_BUILDINGS: { university: string; building: string }[] = [
    { university: "Université de Rennes", building: "Bâtiment 02A" },
    { university: "Université de Rennes", building: "Bâtiment 02B" },
    { university: "Université de Rennes", building: "Bâtiment 12D" },
    { university: "Université de Rennes", building: "Bâtiment 40" },
];
