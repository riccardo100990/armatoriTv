// ====== CONFIG ======
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyVwllC0Sk-FdsOV7SREkzP75k5hyMA-30MY2WL1PrBeFng85jnw9PNloULtNIm6P7vBQ/exec";

// ====== TIPI (JSDoc: VS Code li usa per l'autocompletamento) ======
/**
 * @typedef {"Portiere"|"Difensore"|"Centrocampista"|"Attaccante"} Ruolo
 *
 * @typedef {Object} Giocatore
 * @property {string} nome
 * @property {Ruolo} ruolo
 * @property {boolean} titolare
 * @property {number|null} numeroMaglia
 *
 * @typedef {Object} FormazionePayload
 * @property {number} schemaVersion
 * @property {string} inviatoIl            ISO 8601
 * @property {string} squadraAvversaria
 * @property {string} modulo
 * @property {string} noteTattiche
 * @property {Giocatore[]} giocatori
 * @property {{accettata: boolean, accettataIl: string}} privacy
 * @property {string} [website]            honeypot, deve essere vuoto
 */

// ====== ELEMENTI ======
const form = document.getElementById("formazione-form");
const list = document.getElementById("players-list");
const tpl = document.getElementById("player-template");
const addBtn = document.getElementById("add-player");
const playersError = document.getElementById("players-error");
const alertBox = document.getElementById("form-alert");
const submitBtn = document.getElementById("submit-btn");
const spinner = document.getElementById("spinner");

// ====== GIOCATORI DINAMICI ======
function addPlayer() {
  const node = tpl.content.firstElementChild.cloneNode(true);
  const toggle = node.querySelector(".p-starter");
  const label = node.querySelector(".p-starter-label");

  toggle.addEventListener("change", () => {
    label.textContent = toggle.checked ? "Titolare" : "Panchina";
  });
  node.querySelector(".remove-player").addEventListener("click", () => {
    node.remove();
  });

  list.appendChild(node);
  playersError.classList.add("d-none");
}

addBtn.addEventListener("click", addPlayer);
addPlayer(); // una riga iniziale

// ====== RACCOLTA DATI -> JSON ======
/** @returns {FormazionePayload} */
function buildPayload() {
  const giocatori = [...list.querySelectorAll(".player-row")].map((row) => {
    const num = row.querySelector(".p-number").value.trim();
    return {
      nome: row.querySelector(".p-name").value.trim(),
      ruolo: row.querySelector(".p-role").value,
      titolare: row.querySelector(".p-starter").checked,
      numeroMaglia: num === "" ? null : Number(num),
    };
  });

  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    inviatoIl: now,
    squadraAvversaria: document.getElementById("squadra").value.trim(),
    modulo: document.getElementById("modulo").value.trim(),
    noteTattiche: document.getElementById("note").value.trim(),
    giocatori,
    privacy: {
      accettata: document.getElementById("privacy").checked,
      accettataIl: now,
    },
    website: document.getElementById("website").value, // honeypot
  };
}

// ====== UI ======
function showAlert(type, msg) {
  alertBox.innerHTML = `<div class="alert alert-${type} mb-0">${msg}</div>`;
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  spinner.classList.toggle("d-none", !loading);
}

function resetForm() {
  form.reset();
  form.classList.remove("was-validated");
  list.innerHTML = "";
  addPlayer();
}

// ====== INVIO ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.innerHTML = "";

  const noPlayers = list.children.length === 0;
  playersError.classList.toggle("d-none", !noPlayers);

  form.classList.add("was-validated");
  if (!form.checkValidity() || noPlayers) return;

  setLoading(true);
  try {
    const payload = buildPayload();

    // Honeypot: se compilato è un bot, fingiamo successo senza inviare nulla
    if (payload.website) {
      showAlert("success", "Formazione inviata correttamente. Grazie!");
      return;
    }
    delete payload.website;

    // Google Apps Script richiede una richiesta POST cross-origin senza lettura del body di risposta.
    // Con mode: "no-cors" la risposta è opaca e non può essere letta dal browser,
    // quindi il feedback di successo va mostrato quando la richiesta viene inviata correttamente.
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    showAlert("success", "Formazione inviata correttamente. Grazie!");
    resetForm();
  } catch (err) {
    console.error(err);
    showAlert(
      "danger",
      "Errore durante l'invio. Riprova più tardi o scrivici a armatoritv@gmail.com."
    );
  } finally {
    setLoading(false);
  }
});
