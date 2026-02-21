// ============================================================
//  competitions.js — configurazione centralizzata
//  Per aggiungere una competizione futura basta aggiungere
//  un oggetto a questo array e assicurarsi che lo scraper
//  produca i file:
//    data/classifica_<id>.json
//    data/calendario_<id>.json
// ============================================================

export const COMPETITIONS = [
    {
      id: "girone-b",
      label: "Girone B",
      phase: 1, // fase 1 → sempre sbloccata
    },
    {
      id: "premier-league",
      label: "Premier League",
      phase: 2, // fase 2 → sbloccata solo quando il calendario ha partite
    },
  ];
  
  export const DEFAULT_COMPETITION = "premier-league";
  export const TEAM_DA_EVIDENZIARE = "Amatori Lenola 2023";