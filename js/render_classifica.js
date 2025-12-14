import { includeHtml } from "./utils/include.js";

const TEAM_DA_EVIDENZIARE = "Amatori Lenola 2023";

document.addEventListener("DOMContentLoaded", () => {
  includeHtml("classifica-target", "classifica_aggiornata.html").then(() =>
    renderClassifica()
  );
});

function renderClassifica() {
  fetch("classifica_girone_b.json")
    .then((r) => r.json())
    .then((data) => {
      const tbody = document.getElementById("classifica-body");

      tbody.innerHTML = data.squadre
        .map(
          (team) => `
          <tr class="${team.classe_css} ${
            team.squadra === TEAM_DA_EVIDENZIARE ? "highlight-team" : ""
          }">
            <td>
              <div class="team-info">
                <span class="position-number">${team.posizione}</span>
                <img src="${team.logo}" class="team-logo">
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
    });
}
