export async function includeHtml(elementId, file) {
  try {
    const response = await fetch(file);
    if (!response.ok) {
      throw new Error(`File ${file} non trovato.`);
    }
    const html = await response.text();
    const el = document.getElementById(elementId);
    if (!el) {
      throw new Error(`Elemento #${elementId} non trovato`);
    }
    el.innerHTML = html;
  } catch (error) {
    console.error(`Errore includeHtml(${file}):`, error);
  }
}
