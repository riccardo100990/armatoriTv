// js/renderSponsors.js
export async function renderSponsors() {
  const container = document.getElementById("sponsors-container");
  if (!container) return;

  // fetch JSON dinamicamente (compatibile ovunque)
  const res = await fetch("./sponsor/sponsor_list.json"); // -> adatta il path
  if (!res.ok) {
    container.innerHTML =
      '<div class="col text-center">Impossibile caricare gli sponsor</div>';
    return;
  }
  const data = await res.json();

  container.innerHTML = "";

  data.sponsors.forEach((sponsor) => {
    const colDiv = document.createElement("div");
    colDiv.className = "col text-center";
    colDiv.innerHTML = `
      <div class="sponsor-item">
        <a href="${sponsor.link}" target="_blank" rel="noopener noreferrer">
          <img
            src="${sponsor.img}"
            alt="Sponsor ${sponsor.name}"
            class="sponsor-logo img-fluid"
            style="transform: scale(${sponsor.scale});"
            loading="lazy"
          />
        </a>
      </div>
    `;
    container.appendChild(colDiv);
  });
}
