const DATA_URL = "./data/calendario_girone_b.json";

let currentIndex = 0;
let matches = [];

function buildMatchCard(match, team) {
  const opponent = match.casa === team ? match.trasferta : match.casa;
  const cardClass = match.stato === "Da giocare" ? "next" : "played";

  return `
    <div class="wheel-card ${cardClass}">
      <h5>Giornata ${match.giornata}</h5>
      <h6>📅 ${match.data}</h6>
      <p class="fw-bold mb-1">
        <span class="team-home">${match.casa === team ? team : opponent}</span>
        <span class="vs"> vs </span>
        <span class="team-away">${match.casa === team ? opponent : team}</span>
      </p>
  
      <p class="fw-semibold">
        ${match.risultato ? "⚽ " + match.risultato : "⏳ Da giocare"}
      </p>
    
    </div>
  `;
}

function createIndicators(count) {
  const indicatorsContainer = document.getElementById("wheel-indicators");
  if (!indicatorsContainer) return;

  indicatorsContainer.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const indicator = document.createElement("div");
    indicator.className = `wheel-indicator ${
      i === currentIndex ? "active" : ""
    }`;
    indicator.addEventListener("click", () => {
      currentIndex = i;
      updateWheel();
    });
    indicatorsContainer.appendChild(indicator);
  }
}

function updateWheel() {
  const wheel = document.getElementById("wheel");
  wheel.style.transform = `translateX(-${currentIndex * 100}%)`;

  document.getElementById("prev-btn").disabled = currentIndex === 0;
  document.getElementById("next-btn").disabled =
    currentIndex === matches.length - 1;

  // Aggiorna indicatori
  const indicators = document.querySelectorAll(".wheel-indicator");
  indicators.forEach((indicator, index) => {
    indicator.classList.toggle("active", index === currentIndex);
  });
}

async function initWheel() {
  const res = await fetch(DATA_URL);
  const data = await res.json();

  matches = [...data.played, ...data.upcoming];

  // la prossima partita è la prima delle upcoming
  currentIndex = data.played.length;

  const wheel = document.getElementById("wheel");
  wheel.innerHTML = matches
    .map((m) => `<div class="wheel-item">${buildMatchCard(m, data.team)}</div>`)
    .join("");

  // Crea indicatori
  createIndicators(matches.length);
  updateWheel();

  document.getElementById("prev-btn").onclick = () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateWheel();
    }
  };

  document.getElementById("next-btn").onclick = () => {
    if (currentIndex < matches.length - 1) {
      currentIndex++;
      updateWheel();
    }
  };

  /* === Swipe mobile === */
  let startX = 0;
  wheel.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX));
  wheel.addEventListener("touchend", (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (diff > 50 && currentIndex < matches.length - 1) currentIndex++;
    if (diff < -50 && currentIndex > 0) currentIndex--;
    updateWheel();
  });
}

document.addEventListener("DOMContentLoaded", initWheel);
