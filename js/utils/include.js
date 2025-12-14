export function includeHtml(elementId, file) {
  return fetch(file)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`File ${file} non trovato.`);
      }
      return response.text();
    })
    .then((html) => {
      const el = document.getElementById(elementId);
      if (!el) {
        throw new Error(`Elemento #${elementId} non trovato`);
      }
      el.innerHTML = html;
    })
    .catch((error) => {
      console.error(`Errore includeHtml(${file}):`, error);
    });
}
