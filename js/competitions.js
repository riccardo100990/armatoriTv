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
      id: "girone-a",
      label: "Girone A",
      phase: 1, // fase 1 → sempre sbloccata
    }
  ];
  
  export const DEFAULT_COMPETITION = "girone-a";
  export const TEAM_DA_EVIDENZIARE = "Amatori Lenola 2023";