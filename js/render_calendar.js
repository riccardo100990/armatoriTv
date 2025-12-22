const DATA_URL = "./data/calendario_girone_b.json";

let currentIndex = 0;
let matches = [];
let playedCount = 0;
let teamName = "";

/**
 * Costruisce l'HTML della card per una singola partita.
 * CON ICONE SVG
 */
function buildMatchCard(match, team) {
  const opponent = match.casa === team ? match.trasferta : match.casa;
  const isHome = match.casa === team;
  const cardClass = match.stato === "Da giocare" ? "next" : "played";

  const scorePresent = !!match.risultato;
  const scoreText = scorePresent ? match.risultato : "vs";
  const scoreClass = scorePresent ? "" : "upcoming";

  const title = scorePresent ? `Risultato: ${scoreText}` : "Partita da giocare";

  return `
    <div class="wheel-card ${cardClass}" data-giornata="${match.giornata}">
      <div class="wheel-header">
        <div class="nav-controls" role="group" aria-label="Navigazione precedente">
          <button class="btn-prev" title="Giornata precedente" aria-label="Precedente">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
            </svg>
          </button>
        </div>
        
        <h5>Giornata ${match.giornata} — <small>${match.data || ""}</small></h5>
        
        <div class="nav-controls" role="group" aria-label="Navigazione successiva">
          <button class="btn-next" title="Giornata successiva" aria-label="Successivo">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
      </div>

      <p class="match-line" title="${title}">
        <span class="team-home">${isHome ? team : opponent}</span>
        <span class="score ${scoreClass}">${scoreText}</span>
        <span class="team-away">${isHome ? opponent : team}</span>
      </p>
    </div>
  `;
}

/**
 * Crea gli indicatori e li colora in base allo stato / risultato.
 */
function createIndicators(matchList, team, playedLen) {
  const indicatorsContainer = document.getElementById("wheel-indicators");
  if (!indicatorsContainer) return;

  indicatorsContainer.innerHTML = "";

  matchList.forEach((match, i) => {
    const indicator = document.createElement("div");
    indicator.className = "wheel-indicator";

    if (i === currentIndex) indicator.classList.add("active");

    if (i < playedLen && match.risultato) {
      let parts = match.risultato.replace(/\s/g, "").split("-");
      let home = parseInt(parts[0], 10);
      let away = parseInt(parts[1], 10);

      if (Number.isNaN(home) || Number.isNaN(away)) {
        indicator.classList.add("upcoming");
        indicator.title = `Giornata ${match.giornata} — risultato: ${match.risultato}`;
      } else {
        const isHome = match.casa === team;
        const teamScore = isHome ? home : away;
        const oppScore = isHome ? away : home;

        if (teamScore > oppScore) {
          indicator.classList.add("win");
          indicator.title = `Vittoria — ${teamScore}-${oppScore}`;
        } else if (teamScore === oppScore) {
          indicator.classList.add("draw");
          indicator.title = `Pareggio — ${teamScore}-${oppScore}`;
        } else {
          indicator.classList.add("loss");
          indicator.title = `Sconfitta — ${teamScore}-${oppScore}`;
        }
      }
    } else {
      indicator.classList.add("upcoming");
      indicator.title = match.data
        ? `Prossima: ${match.data}`
        : "Partita da giocare";
    }

    indicator.addEventListener("click", () => {
      currentIndex = i;
      updateWheel();
    });

    indicatorsContainer.appendChild(indicator);
  });
}

/** Aggiorna transform e stato indicatori */
function updateWheel() {
  const wheel = document.getElementById("wheel");
  wheel.style.transform = `translateX(-${currentIndex * 100}%)`;

  const indicators = document.querySelectorAll(".wheel-indicator");
  indicators.forEach((indicator, idx) => {
    indicator.classList.toggle("active", idx === currentIndex);
  });

  const activeCard = document.querySelectorAll(".wheel-item")[currentIndex];
  if (activeCard) {
    const card = activeCard.querySelector(".wheel-card");
    if (card) card.focus?.();
  }
}

/** Inizializzazione principale */
async function initWheel() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok)
      throw new Error("Impossibile caricare il file JSON: " + res.status);
    const data = await res.json();

    matches = [...(data.played || []), ...(data.upcoming || [])];
    playedCount = (data.played || []).length;
    teamName = data.team || "";

    currentIndex = playedCount;

    const wheel = document.getElementById("wheel");
    wheel.innerHTML = matches
      .map(
        (m) => `<div class="wheel-item">${buildMatchCard(m, teamName)}</div>`
      )
      .join("");

    // Listener per bottoni prev
    document.querySelectorAll(".btn-prev").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
          currentIndex--;
          updateWheel();
        }
      });
    });

    // Listener per bottoni next
    document.querySelectorAll(".btn-next").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentIndex < matches.length - 1) {
          currentIndex++;
          updateWheel();
        }
      });
    });

    createIndicators(matches, teamName, playedCount);
    updateWheel();

    // Swipe mobile
    let startX = 0;
    wheel.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX;
      },
      { passive: true }
    );
    wheel.addEventListener(
      "touchend",
      (e) => {
        const diff = startX - e.changedTouches[0].clientX;
        if (diff > 50 && currentIndex < matches.length - 1) currentIndex++;
        if (diff < -50 && currentIndex > 0) currentIndex--;
        updateWheel();
      },
      { passive: true }
    );
  } catch (err) {
    console.error(err);
    const wrapper = document.getElementById("calendar-wrapper");
    wrapper.innerHTML = `<div style="color:#a00;padding:12px;background:#fff;border-radius:8px;">Errore caricamento calendario: ${err.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", initWheel);
