// render_statistiche.js
const ROSA_URL = "./data/rosa.json";

const ROLE_MAP = {
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

// Avvia il rendering quando il DOM è pronto
document.addEventListener("DOMContentLoaded", renderStatistiche);
