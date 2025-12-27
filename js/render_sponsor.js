// js/render_sponsor.js
export async function renderSponsors() {
  const container = document.getElementById("sponsors-container");
  if (!container) return;

  try {
    const res = await fetch("./data/sponsor_list.json"); // Adatta il path se serve
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

      // Controllo se il link è valido
      const hasValidLink = sponsor.link && !sponsor.link.startsWith("[LINK");

      // HTML della sponsor card
      colDiv.innerHTML = `
        <div class="sponsor-item">
          ${
            hasValidLink
              ? `<a href="${sponsor.link}" target="_blank" rel="noopener noreferrer">`
              : ""
          }
            <img
              src="${sponsor.img}"
              alt="Sponsor ${sponsor.name}"
              class="sponsor-logo img-fluid"
              style="transform: scale(${sponsor.scale});"
              loading="lazy"
            />
          ${hasValidLink ? "</a>" : ""}
        </div>
      `;

      container.appendChild(colDiv);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div class="col text-center">Errore nel caricamento degli sponsor</div>';
  }
}
