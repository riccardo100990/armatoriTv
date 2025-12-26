// squadra.js - Script unificato per la pagina squadra.html

const ROSA_URL = "./data/rosa.json";

// Mappe per i ruoli
const ROLE_MAP_FULL = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
};

const ROLE_MAP_SINGLE = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};

const ROLE_COLORS = {
  P: "#faa626",
  D: "#61c517",
  C: "#4da9fd",
  A: "#e21e3e",
};

// Definizione dei team (puoi modificare questi mapping se hai dati specifici)
const TEAM_MAPPING = {
  prof: {
    name: "Team Prof",
    color: "#4da9fd",
    players: [], // Sarà popolato dinamicamente
  },
  summer: {
    name: "Team Summer",
    color: "#e21e3e",
    players: [],
  },
  undefined: {
    name: "Non Dichiarati",
    color: "#666",
    players: [],
  },
};

// Cache per i dati della rosa
let rosaData = null;
let isLoading = false;
let currentView = "role"; // 'role' o 'team'

// Funzione per caricare i dati della rosa
async function loadRosaData() {
  if (rosaData) {
    return rosaData;
  }

  if (isLoading) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (rosaData) {
          clearInterval(checkInterval);
          resolve(rosaData);
        }
      }, 100);
    });
  }

  isLoading = true;
  try {
    const res = await fetch(ROSA_URL);
    if (!res.ok) {
      throw new Error(`Errore nel caricamento dei dati: ${res.status}`);
    }
    rosaData = await res.json();
    isLoading = false;
    return rosaData;
  } catch (error) {
    console.error("Impossibile caricare il file rosa.json:", error);
    isLoading = false;
    return null;
  }
}

// Funzione per determinare a quale team appartiene un giocatore
function getPlayerTeam(playerName, playerData) {
  // Logica di assegnazione - MODIFICA QUESTA PARTE CON I TUOI DATI REALI
  // Attualmente assegna casualmente, ma puoi sostituire con:
  // 1. Un campo "team" nel JSON rosa.json
  // 2. Un mapping statico in TEAM_MAPPING
  // 3. Qualsiasi altra logica

  // Esempio: assegnazione basata sul primo carattere del nome
  const firstLetter = playerName.charAt(0).toUpperCase();

  // Puoi creare la tua logica qui. Per esempio:
  // Se il giocatore ha già un campo team nei dati, usalo
  if (playerData.team) {
    return playerData.team;
  }

  // Altrimenti, assegnazione basata su varie regole
  // Esempio: A-M -> Team Prof, N-Z -> Team Summer
  if (firstLetter >= "A" && firstLetter <= "M") {
    return "prof";
  } else if (firstLetter >= "N" && firstLetter <= "Z") {
    return "summer";
  } else {
    return "undefined";
  }
}

// Funzione per renderizzare la rosa per ruolo (visualizzazione originale)
function renderRosaByRole(rosa) {
  const container = document.querySelector(".players-container");
  if (!container) return;

  container.innerHTML = "";
  container.className = "players-container role-view";

  // Raggruppa per ruolo
  const grouped = {};

  for (const [name, data] of Object.entries(rosa)) {
    const ruolo = data.ruolo;
    if (!grouped[ruolo]) grouped[ruolo] = [];
    grouped[ruolo].push({ name, ...data });
  }

  // Ordine ruoli
  ["P", "D", "C", "A"].forEach((roleKey) => {
    if (!grouped[roleKey]) return;

    const card = document.createElement("div");
    card.className = `role-card ${roleKey}`;

    const title = document.createElement("div");
    title.className = "role-title";
    title.textContent = ROLE_MAP_FULL[roleKey];

    card.appendChild(title);

    grouped[roleKey].forEach((player) => {
      const p = document.createElement("div");
      p.className = "player-name";

      // Mostra anche il team se disponibile
      const team = getPlayerTeam(player.name, player);
      const teamBadge =
        team !== "undefined"
          ? `<span class="mini-team-badge ${team}-badge">${TEAM_MAPPING[team].name}</span>`
          : "";

      p.innerHTML = `${player.name} ${teamBadge}`;
      card.appendChild(p);
    });

    container.appendChild(card);
  });
}

// Funzione per renderizzare la rosa per team
function renderRosaByTeam(rosa) {
  const container = document.querySelector(".players-container");
  if (!container) return;

  container.innerHTML = "";
  container.className = "players-container team-view";

  // Raggruppa per team
  const teams = {
    prof: { ...TEAM_MAPPING.prof, players: [] },
    summer: { ...TEAM_MAPPING.summer, players: [] },
    undefined: { ...TEAM_MAPPING.undefined, players: [] },
  };

  // Raccogli tutti i giocatori nei rispettivi team
  for (const [name, data] of Object.entries(rosa)) {
    const team = getPlayerTeam(name, data);
    teams[team].players.push({ name, ...data });
  }

  // Ordine di visualizzazione: Prof, Summer, Non Dichiarati
  ["prof", "summer", "undefined"].forEach((teamKey) => {
    const team = teams[teamKey];

    // Non mostrare team vuoti
    if (team.players.length === 0 && teamKey !== "undefined") return;

    const card = document.createElement("div");
    card.className = `role-card team-card ${teamKey}`;

    const title = document.createElement("div");
    title.className = "role-title";
    title.textContent = `${team.name} (${team.players.length} giocatori)`;

    card.appendChild(title);

    // Ordina i giocatori per ruolo all'interno del team
    const roleOrder = { P: 0, D: 1, C: 2, A: 3 };
    team.players.sort((a, b) => {
      if (roleOrder[a.ruolo] !== roleOrder[b.ruolo]) {
        return roleOrder[a.ruolo] - roleOrder[b.ruolo];
      }
      return a.name.localeCompare(b.name);
    });

    team.players.forEach((player) => {
      const p = document.createElement("div");
      p.className = "player-name";
      p.innerHTML = `
        ${player.name} 
        <span class="player-role-badge" style="background-color: ${
          ROLE_COLORS[player.ruolo]
        }">
          ${ROLE_MAP_SINGLE[player.ruolo]}
        </span>
      `;
      card.appendChild(p);
    });

    container.appendChild(card);
  });
}

// Funzione principale per renderizzare la rosa (gestisce entrambe le visualizzazioni)
function renderRosa(rosa, viewMode = "role") {
  if (viewMode === "role") {
    renderRosaByRole(rosa);
  } else if (viewMode === "team") {
    renderRosaByTeam(rosa);
  }
}

// Funzione per switchare tra le visualizzazioni
function setupViewSwitcher() {
  const viewBtns = document.querySelectorAll(".view-btn");

  viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Rimuovi active da tutti i bottoni
      viewBtns.forEach((b) => b.classList.remove("active"));

      // Aggiungi active al bottone cliccato
      btn.classList.add("active");

      // Cambia visualizzazione
      const newView = btn.getAttribute("data-view");
      currentView = newView;

      // Rerenderizza la rosa
      renderRosa(rosaData, newView);
    });
  });
}

const ROLE_MAP = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};

async function renderStatistiche() {
  try {
    const res = await fetch(ROSA_URL);
    const rosa = await res.json();

    const statsBody = document.getElementById("stats-body");
    statsBody.innerHTML = "";

    // Calcola i totali per squadra
    let teamProfGoals = 0;
    let teamProfAssists = 0;
    let teamSummerGoals = 0;
    let teamSummerAssists = 0;

    // Converti oggetto in array e ordina per ruolo e nome
    const playersArray = Object.entries(rosa).map(([name, data]) => ({
      name,
      ...data,
    }));

    playersArray.sort((a, b) => {
      const roleOrder = { P: 0, D: 1, C: 2, A: 3 };
      if (roleOrder[a.ruolo] !== roleOrder[b.ruolo]) {
        return roleOrder[a.ruolo] - roleOrder[b.ruolo];
      }
      return a.name.localeCompare(b.name);
    });

    // Renderizza ogni giocatore
    playersArray.forEach((player) => {
      const row = document.createElement("tr");
      row.className = `player-row role-${player.ruolo}`;
      row.setAttribute("data-role", player.ruolo);

      // Determina a quale team appartiene (esempio: divisione casuale o basata su ruolo)
      // Per ora, dividiamo i giocatori alternativamente
      const isTeamProf = Math.random() > 0.5; // Sostituire con logica reale

      // Aggiorna totali squadre
      if (isTeamProf) {
        teamProfGoals += player.goals.length;
        teamProfAssists += player.assist.length;
      } else {
        teamSummerGoals += player.goals.length;
        teamSummerAssists += player.assist.length;
      }

      // Calcola punti totali (goal + assist)
      const totalPoints = player.goals.length + player.assist.length;

      row.innerHTML = `
        <td>
          <span class="player-name">${player.name}</span>
          <span class="player-team-badge ${
            isTeamProf ? "team-prof-badge" : "team-summer-badge"
          }">
            ${isTeamProf ? "PROF" : "SUMMER"}
          </span>
        </td>
        <td>
          <span class="role-badge" style="background-color: ${
            ROLE_COLORS[player.ruolo]
          }">
            ${ROLE_MAP[player.ruolo]}
          </span>
        </td>
        <td class="goals-cell">${player.goals.length}</td>
        <td class="assists-cell">${player.assist.length}</td>
        <td class="total-points">${totalPoints}</td>
      `;

      statsBody.appendChild(row);
    });

    // Aggiorna le statistiche totali nella sezione sfida
    updateTeamStats(
      teamProfGoals,
      teamProfAssists,
      teamSummerGoals,
      teamSummerAssists
    );

    // Aggiungi event listeners ai filtri
    setupFilters();
  } catch (error) {
    console.error("Errore nel caricamento delle statistiche:", error);
    document.getElementById("stats-body").innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          Errore nel caricamento delle statistiche
        </td>
      </tr>
    `;
  }
}

function updateTeamStats(profGoals, profAssists, summerGoals, summerAssists) {
  // Puoi aggiornare qui i valori nella tabella di confronto
  // quando implementi una logica reale per assegnare i giocatori ai team
  console.log("Team Prof:", { goals: profGoals, assists: profAssists });
  console.log("Team Summer:", { goals: summerGoals, assists: summerAssists });
}

function setupFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Rimuovi active da tutti i bottoni
      filterButtons.forEach((b) => b.classList.remove("active"));
      // Aggiungi active al bottone cliccato
      btn.classList.add("active");

      const filter = btn.getAttribute("data-filter");
      filterPlayers(filter);
    });
  });
}

function filterPlayers(filter) {
  const rows = document.querySelectorAll(".player-row");

  rows.forEach((row) => {
    if (filter === "all") {
      row.style.display = "";
    } else {
      const role = row.getAttribute("data-role");
      row.style.display = role === filter ? "" : "none";
    }
  });
}

// [Mantieni tutte le funzioni renderStatistiche, setupFilters, etc.]

// Funzione principale che carica i dati e inizializza tutto
async function initSquadraPage() {
  const rosa = await loadRosaData();
  if (!rosa) {
    // Mostra un messaggio di errore se il caricamento fallisce
    const container = document.querySelector(".players-container");
    if (container) {
      container.innerHTML = `<p class="error-message">Errore nel caricamento della rosa.</p>`;
    }
    const statsBody = document.getElementById("stats-body");
    if (statsBody) {
      statsBody.innerHTML = `<tr><td colspan="5" class="error-message">Errore nel caricamento delle statistiche.</td></tr>`;
    }
    return;
  }

  // Renderizza la rosa con visualizzazione predefinita (per ruolo)
  renderRosa(rosa, currentView);

  // Configura i bottoni di switch
  setupViewSwitcher();

  // Renderizza le statistiche (tabella)
  renderStatistiche(rosa);
}

// Inizializza quando il DOM è pronto
document.addEventListener("DOMContentLoaded", initSquadraPage);
