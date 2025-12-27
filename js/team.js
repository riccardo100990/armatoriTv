// squadra.js - Script unificato per la pagina squadra.html

const ROSA_URL = "./data/rosa.json";

/* ===========================
   MAPPE E COSTANTI
=========================== */

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

const TEAM_MAPPING = {
  prof: { name: "Team Prof", color: "#4da9fd" },
  summer: { name: "Team Summer", color: "#e21e3e" },
  undefined: { name: "Non Dichiarati", color: "#666" },
};

/* ===========================
   STATO
=========================== */

let rosaData = null;
let isLoading = false;

/* ===========================
   DATA LOADING
=========================== */

async function loadRosaData() {
  if (rosaData) return rosaData;

  if (isLoading) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (rosaData) {
          clearInterval(interval);
          resolve(rosaData);
        }
      }, 100);
    });
  }

  isLoading = true;

  try {
    const res = await fetch(ROSA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rosaData = await res.json();
    return rosaData;
  } catch (err) {
    console.error("Errore caricamento rosa.json:", err);
    return null;
  } finally {
    isLoading = false;
  }
}

/* ===========================
   TEAM RESOLUTION
=========================== */

function getPlayerTeam(playerData) {
  if (!playerData.team || playerData.team.trim() === "") {
    return "undefined";
  }

  if (playerData.team === "prof" || playerData.team === "summer") {
    return playerData.team;
  }

  return "undefined";
}

/* ===========================
   ROSA PER RUOLO
=========================== */

function renderRosaByRole(rosa) {
  const container = document.querySelector(".players-container");
  if (!container) return;

  container.innerHTML = "";
  container.className = "players-container role-view";

  const grouped = {};

  for (const [name, data] of Object.entries(rosa)) {
    if (!grouped[data.ruolo]) grouped[data.ruolo] = [];
    grouped[data.ruolo].push({ name, ...data });
  }

  ["P", "D", "C", "A"].forEach((roleKey) => {
    if (!grouped[roleKey]) return;

    const card = document.createElement("div");
    card.className = `role-card ${roleKey}`;

    const title = document.createElement("div");
    title.className = "role-title";
    title.textContent = ROLE_MAP_FULL[roleKey];
    card.appendChild(title);

    grouped[roleKey].forEach((player) => {
      const team = getPlayerTeam(player);

      const teamBadge =
        team !== "undefined"
          ? `<span class="mini-team-badge ${team}-badge">
               ${TEAM_MAPPING[team].name}
             </span>`
          : "";

      const p = document.createElement("div");
      p.className = "player-name";
      p.innerHTML = `${player.name} ${teamBadge}`;
      card.appendChild(p);
    });

    container.appendChild(card);
  });
}

/* ===========================
   STATISTICHE
=========================== */

// async function renderStatistiche() {
//   const rosa = rosaData;
//   if (!rosa) return;

//   const statsBody = document.getElementById("stats-body");
//   statsBody.innerHTML = "";

//   let teamProfGoals = 0,
//     teamProfAssists = 0,
//     teamSummerGoals = 0,
//     teamSummerAssists = 0;

//   const players = Object.entries(rosa).map(([name, data]) => ({
//     name,
//     ...data,
//   }));

//   const roleOrder = { P: 0, D: 1, C: 2, A: 3 };
//   players.sort((a, b) =>
//     roleOrder[a.ruolo] !== roleOrder[b.ruolo]
//       ? roleOrder[a.ruolo] - roleOrder[b.ruolo]
//       : a.name.localeCompare(b.name)
//   );

//   players.forEach((player) => {
//     const team = getPlayerTeam(player);
//     const goals = player.goals.length;
//     const assists = player.assist.length;

//     if (team === "prof") {
//       teamProfGoals += goals;
//       teamProfAssists += assists;
//     } else if (team === "summer") {
//       teamSummerGoals += goals;
//       teamSummerAssists += assists;
//     }

//     const teamBadge =
//       team !== "undefined"
//         ? `<span class="player-team-badge team-${team}-badge">
//              ${TEAM_MAPPING[team].name}
//            </span>`
//         : "";

//     const row = document.createElement("tr");
//     row.className = `player-row role-${player.ruolo}`;
//     row.dataset.role = player.ruolo;

//     row.innerHTML = `
//       <td><span class="player-name">${player.name}</span> ${teamBadge}</td>
//       <td><span class="role-badge" style="background:${
//         ROLE_COLORS[player.ruolo]
//       }">
//           ${ROLE_MAP_SINGLE[player.ruolo]}
//       </span></td>
//       <td>${goals}</td>
//       <td>${assists}</td>
//       <td>${goals + assists}</td>
//     `;

//     statsBody.appendChild(row);
//   });

//   updateTeamStats(
//     teamProfGoals,
//     teamProfAssists,
//     teamSummerGoals,
//     teamSummerAssists
//   );
//   setupFilters();
// }

function updateTeamStats(pG, pA, sG, sA) {
  console.log("Team Prof:", pG, pA);
  console.log("Team Summer:", sG, sA);
}

/* ===========================
   FILTRI
=========================== */

function setupFilters() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filterPlayers(btn.dataset.filter);
    });
  });
}

function filterPlayers(filter) {
  document.querySelectorAll(".player-row").forEach((row) => {
    row.style.display =
      filter === "all" || row.dataset.role === filter ? "" : "none";
  });
}

function renderPlayersInTeamBoxes(rosa) {
  const profContainer = document.getElementById("team-prof-players");
  const summerContainer = document.getElementById("team-summer-players");

  if (!profContainer || !summerContainer) return;

  profContainer.innerHTML = "";
  summerContainer.innerHTML = "";

  const roleOrder = { P: 0, D: 1, C: 2, A: 3 };

  const players = Object.entries(rosa)
    .map(([name, data]) => ({ name, ...data }))
    .filter((p) => p.team === "prof" || p.team === "summer")
    .sort((a, b) =>
      roleOrder[a.ruolo] !== roleOrder[b.ruolo]
        ? roleOrder[a.ruolo] - roleOrder[b.ruolo]
        : a.name.localeCompare(b.name)
    );

  players.forEach((player) => {
    const el = document.createElement("div");
    el.className = `team-player role-${player.ruolo}`;

    el.innerHTML = `
      <span class="role-bar"></span>
      <span class="team-player-name">${player.name}</span>
    `;

    (player.team === "prof" ? profContainer : summerContainer).appendChild(el);
  });
}

function calculateTeamStats(rosa) {
  const stats = {
    prof: {
      goals: 0,
      assist: 0,
      ammonizioni: 0,
      espulsioni: 0,
      clean_sheet: 0,
    },
    summer: {
      goals: 0,
      assist: 0,
      ammonizioni: 0,
      espulsioni: 0,
      clean_sheet: 0,
    },
  };

  for (const player of Object.values(rosa)) {
    const team = getPlayerTeam(player);
    if (team !== "prof" && team !== "summer") continue;

    stats[team].goals += player.goals || 0;
    stats[team].assist += player.assist || 0;
    stats[team].ammonizioni += player.ammonizioni || 0;
    stats[team].espulsioni += player.espulsioni || 0;

    // porte inviolate SOLO per portieri
    if (player.ruolo === "P") {
      stats[team].clean_sheet += player.clean_sheet || 0;
    }
  }

  return stats;
}

function renderConfrontoTable(teamStats) {
  const mapping = {
    goals: "goals",
    assists: "assist",
    ammonizioni: "ammonizioni",
    espulsioni: "espulsioni",
    "porte-inviolate": "clean_sheet",
  };

  Object.entries(mapping).forEach(([rowClass, statKey]) => {
    const row = document.querySelector(`.confronto-table tr.${rowClass}`);
    if (!row) return;

    const profCell = row.querySelector(".team-prof");
    const summerCell = row.querySelector(".team-summer");

    profCell.textContent = teamStats.prof[statKey];
    summerCell.textContent = teamStats.summer[statKey];
  });
}

function calculateTeamScore(teamStat) {
  const score =
    teamStat.goals * 3 +
    teamStat.assist * 1 +
    teamStat.clean_sheet * 1 -
    teamStat.ammonizioni * 0.5 -
    teamStat.espulsioni * 1;

  // sempre una cifra decimale (6.0, 6.5, ecc.)
  return Number(score.toFixed(1));
}

function renderTeamScores(teamStats) {
  const profScore = calculateTeamScore(teamStats.prof);
  const summerScore = calculateTeamScore(teamStats.summer);

  const profEl = document.querySelector(".team-box.team-prof .score-number");
  const summerEl = document.querySelector(
    ".team-box.team-summer .score-number"
  );

  if (profEl) profEl.textContent = profScore;
  if (summerEl) summerEl.textContent = summerScore;
}

/* ===========================
   INIT
=========================== */

async function initSquadraPage() {
  const rosa = await loadRosaData();
  if (!rosa) return;

  renderRosaByRole(rosa);
  renderPlayersInTeamBoxes(rosa);

  const teamStats = calculateTeamStats(rosa);

  renderConfrontoTable(teamStats);
  renderTeamScores(teamStats);
}

document.addEventListener("DOMContentLoaded", initSquadraPage);
