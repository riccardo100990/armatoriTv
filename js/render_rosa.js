const ROSA_URL = "./data/rosa.json"; // percorso al tuo JSON

const ROLE_MAP = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
};

async function renderRosa() {
  const res = await fetch(ROSA_URL);
  const rosa = await res.json();

  const container = document.querySelector(".players-container");
  container.innerHTML = "";

  // raggruppa per ruolo
  const grouped = {};

  for (const [name, data] of Object.entries(rosa)) {
    const ruolo = data.ruolo;
    if (!grouped[ruolo]) grouped[ruolo] = [];
    grouped[ruolo].push(name);
  }

  // ordine ruoli
  ["P", "D", "C", "A"].forEach((roleKey) => {
    if (!grouped[roleKey]) return;

    const card = document.createElement("div");
    card.className = `role-card ${roleKey}`;

    const title = document.createElement("div");
    title.className = "role-title";
    title.textContent = ROLE_MAP[roleKey];

    card.appendChild(title);

    grouped[roleKey].forEach((player) => {
      const p = document.createElement("div");
      p.className = "player-name";
      p.textContent = player;
      card.appendChild(p);
    });

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", renderRosa);
