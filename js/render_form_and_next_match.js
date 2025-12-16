const DATA_URL = "./calendario_girone_b.json";

function esitoToClass(esito) {
  if (esito === "W") return "bg-success";
  if (esito === "L") return "bg-danger";
  return "bg-warning";
}

async function renderFormAndNextMatch(limit = 5) {
  const res = await fetch(DATA_URL);
  const data = await res.json();

  /* ===== FORMA RECENTE ===== */
  const played = data.played.slice(-limit); // ultime N
  const container = document.getElementById("recent-form");

  played.forEach((match) => {
    const div = document.createElement("div");
    div.className = `rounded-circle text-white fw-bold d-flex align-items-center justify-content-center ${esitoToClass(
      match.esito
    )}`;
    div.style.width = "36px";
    div.style.height = "36px";
    div.textContent = match.esito;
    container.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderFormAndNextMatch(5); // cambia in 3 se vuoi
});
