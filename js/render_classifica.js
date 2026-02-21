import { includeHtml } from "./utils/include.js";
import {
  COMPETITIONS,
  DEFAULT_COMPETITION,
  TEAM_DA_EVIDENZIARE,
} from "./competitions.js";

let currentCompetition = DEFAULT_COMPETITION;

document.addEventListener("DOMContentLoaded", async () => {
  await includeHtml("classifica-target", "classifica_aggiornata.html");
  await buildTabs();
  await renderClassifica(currentCompetition);
});

// ── Controlla se una competizione ha partite nel calendario ──────────────────
async function hasMatches(competitionId) {
  try {
    const res = await fetch(`./data/calendario_${competitionId}.json`);
    if (!res.ok) return false;
    const data = await res.json();
    const total = (data.played?.length ?? 0) + (data.upcoming?.length ?? 0);
    return total > 0;
  } catch {
    return false;
  }
}

// ── Costruisce i tab dinamicamente dalla config ──────────────────────────────
async function buildTabs() {
  const container = document.getElementById("classifica-tabs");
  if (!container) return;

  const tabs = await Promise.all(
    COMPETITIONS.map(async (comp) => {
      const available = comp.phase === 1 || (await hasMatches(comp.id));
      return { ...comp, available };
    })
  );

  container.innerHTML = tabs
    .map((comp) => {
      const isActive = comp.id === currentCompetition;
      const isLocked = !comp.available;
      return `
        <button
          class="tab-btn ${isActive ? "active" : ""} ${isLocked ? "locked" : ""}"
          data-competition="${comp.id}"
          ${isLocked ? 'disabled title="Disponibile al termine del girone"' : ""}
          aria-pressed="${isActive}"
        >
          ${comp.label}
          ${isLocked ? '<i class="bi bi-lock-fill ms-1" style="font-size:.75em"></i>' : ""}
        </button>
      `;
    })
    .join("");

  container.querySelectorAll(".tab-btn:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", async () => {
      currentCompetition = btn.dataset.competition;

      container.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-pressed", b === btn);
      });

      await renderClassifica(currentCompetition);

      // Notifica il calendario del cambio competizione
      document.dispatchEvent(
        new CustomEvent("competition-change", {
          detail: { id: currentCompetition },
        })
      );
    });
  });
}

// ── Renderizza la classifica per la competizione selezionata ─────────────────
async function renderClassifica(competitionId) {
  const tbody = document.getElementById("classifica-body");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="9" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
        <span class="ms-2">Caricamento...</span>
      </td>
    </tr>`;

  try {
    const res = await fetch(`./data/classifica_${competitionId}.json`);
    if (!res.ok) throw new Error("File non trovato");
    const data = await res.json();

    tbody.innerHTML = data.squadre
      .map(
        (team) => `
        <tr class="${team.classe_css} ${
          team.squadra === TEAM_DA_EVIDENZIARE ? "highlight-team" : ""
        }">
          <td>
            <div class="team-info">
              <span class="position-number">${team.posizione}</span>
              <img src="${team.logo}" class="team-logo" alt="${team.squadra}">
              <span class="team-name">${team.squadra}</span>
            </div>
          </td>
          <td>${team.punti}</td>
          <td>${team.giocate}</td>
          <td>${team.vinte}</td>
          <td>${team.pareggi}</td>
          <td>${team.perse}</td>
          <td>${team.gf}</td>
          <td>${team.gs}</td>
          <td>${team.dr >= 0 ? "+" : ""}${team.dr}</td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-danger py-3">
          Errore caricamento dati: ${err.message}
        </td>
      </tr>`;
  }
}