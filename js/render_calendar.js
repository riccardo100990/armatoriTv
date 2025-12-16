const DATA_URL = "./data/calendario_girone_b.json";

let currentIndex = 0;
let matches = [];

function buildMatchCard(match, team) {
  const opponent = match.casa === team ? match.trasferta : match.casa;

  return `
    <div class="wheel-card ${match.stato === "Da giocare" ? "next" : ""}">
      <h5>Giornata ${match.giornata}</h5>
      <p class="fw-bold mb-1">${team} vs ${opponent}</p>
      <p class="mb-1">📅 ${match.data}</p>
      <p class="mb-2">📍 ${match.campo}</p>
      <p class="fw-semibold">
        ${match.risultato ? "⚽ " + match.risultato : "⏳ Da giocare"}
      </p>
    </div>
  `;
}

function updateWheel() {
  const wheel = document.getElementById("wheel");
  wheel.style.transform = `translateX(-${currentIndex * 100}%)`;

  document.getElementById("prev-btn").disabled = currentIndex === 0;
  document.getElementById("next-btn").disabled =
    currentIndex === matches.length - 1;
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
