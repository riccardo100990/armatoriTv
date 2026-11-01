// ====== CONFIG ======
const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyVwllC0Sk-FdsOV7SREkzP75k5hyMA-30MY2WL1PrBeFng85jnw9PNloULtNIm6P7vBQ/exec";

const DEFAULT_ROSTER_SIZE = 15;
const SLOTS_COUNT = 11;

// Coordinate calibrate per modulo (identiche a atv_obs per perfetta coerenza visiva)
const POSITIONS = {
  "4-3-3": [
    [50, 90],
    [18, 69], [39, 72], [61, 72], [82, 69],
    [28, 49], [50, 54], [72, 49],
    [18, 25], [50, 20], [82, 25]
  ],
  "4-4-2": [
    [50, 90],
    [18, 69], [39, 72], [61, 72], [82, 69],
    [15, 46], [38, 50], [62, 50], [85, 46],
    [36, 21], [64, 21]
  ],
  "3-5-2": [
    [50, 90],
    [27, 70], [50, 74], [73, 70],
    [10, 48], [31, 50], [50, 55], [69, 50], [90, 48],
    [36, 21], [64, 21]
  ],
  "4-2-3-1": [
    [50, 90],
    [18, 69], [39, 72], [61, 72], [82, 69],
    [36, 56], [64, 56],
    [18, 38], [50, 40], [82, 38],
    [50, 20]
  ],
  "3-4-3": [
    [50, 90],
    [27, 70], [50, 74], [73, 70],
    [15, 50], [38, 52], [62, 52], [85, 50],
    [18, 25], [50, 20], [82, 25]
  ],
  "5-3-2": [
    [50, 90],
    [10, 66], [28, 71], [50, 74], [72, 71], [90, 66],
    [28, 49], [50, 54], [72, 49],
    [36, 21], [64, 21]
  ],
  "4-5-1": [
    [50, 90],
    [18, 69], [39, 72], [61, 72], [82, 69],
    [12, 48], [31, 50], [50, 54], [69, 50], [88, 48],
    [50, 20]
  ]
};

// Calcolo coordinate di fallback per moduli personalizzati
function pitchCoords(formation) {
  if (POSITIONS[formation]) return POSITIONS[formation];
  const lines = String(formation || "4-4-2").split("-").map(Number).filter(n => n > 0);
  const coords = [[50, 90]]; // Portiere
  const yTop = 20, yBottom = 70;
  lines.forEach((count, k) => {
    const y = lines.length === 1 ? 45 : yBottom - k * (yBottom - yTop) / (lines.length - 1);
    for (let j = 0; j < count; j++) {
      coords.push([(j + 1) * 100 / (count + 1), y]);
    }
  });
  return coords.slice(0, SLOTS_COUNT);
}

// Deduce il ruolo tattico dallo slot in campo e dal modulo
function deduceRole(slotIndex, modulo) {
  if (slotIndex === 0) return "Portiere";
  const parts = String(modulo || "4-4-2").split("-").map(Number).filter(n => n > 0);
  const lines = [1, ...parts];
  let running = 0;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    running += lines[lineIdx];
    if (slotIndex < running) {
      if (lineIdx === 1) return "Difensore";
      if (lineIdx === lines.length - 1) return "Attaccante";
      return "Centrocampista";
    }
  }
  return "Centrocampista";
}

function newId() {
  return "p-" + Math.random().toString(36).slice(2, 9);
}

function toNumber(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(99, Math.trunc(n))) : null;
}

const hasData = p => !!p && (!!(p.name || "").trim() || (p.number != null && p.number !== ""));

// Inizializzazione pagina
function initFormazionePage() {
  const form = document.getElementById("formazione-form");
  const rosterWrap = document.getElementById("roster-list");
  const pitchWrap = document.getElementById("pitch-container");
  const benchWrap = document.getElementById("bench-list");
  const moduloSelect = document.getElementById("modulo");
  const pitchBadge = document.getElementById("pitch-formation-badge");
  const startersCountEl = document.getElementById("starters-count");
  const rosterCountBadge = document.getElementById("roster-count-badge");
  const benchCountBadge = document.getElementById("bench-count-badge");
  const playersError = document.getElementById("players-error");
  const alertBox = document.getElementById("form-alert");
  const submitBtn = document.getElementById("submit-btn");
  const spinner = document.getElementById("spinner");

  // Modal pick giocatore per slot
  const pickModal = document.getElementById("awayPickModal");
  const pickModalTitle = document.getElementById("pickModalTitle");
  const pickModalList = document.getElementById("pickModalList");
  const pickModalClose = document.getElementById("pickModalClose");

  // Modal privacy
  const privacyModalEl = document.getElementById("privacyModal");
  let privacyModal = null;
  if (privacyModalEl && typeof bootstrap !== "undefined" && bootstrap.Modal) {
    privacyModal = new bootstrap.Modal(privacyModalEl);
  }
  const linkOpenPrivacy = document.getElementById("link-open-privacy");
  const btnConfirmPrivacy = document.getElementById("btn-confirm-privacy");

  if (!form || !rosterWrap || !pitchWrap || !benchWrap || !moduloSelect) return;

  // STATO APPLICATIVO
  // Inizializza 15 giocatori per una compilazione rapida
  let roster = Array.from({ length: DEFAULT_ROSTER_SIZE }, () => ({
    id: newId(),
    name: "",
    number: null
  }));

  // 11 slot del campo: contengono l'id del giocatore o null
  let lineup = Array(SLOTS_COUNT).fill(null);
  let currentPickSlot = null;
  let captainId = null; // id del capitano (uno solo)

  // Stato accettazione privacy e azione in sospeso
  let privacyAccepted = false;
  let pendingPrivacyAction = null; // 'submit' | 'download'

  // --------------------------------------------------------------------------
  // GESTIONE MODALE PRIVACY
  // --------------------------------------------------------------------------
  function openPrivacyModal(action = null) {
    pendingPrivacyAction = action;
    if (privacyModal) {
      privacyModal.show();
    } else if (privacyModalEl) {
      privacyModalEl.classList.add("show");
      privacyModalEl.style.display = "block";
    }
  }

  function hidePrivacyModal() {
    if (privacyModal) {
      privacyModal.hide();
    } else if (privacyModalEl) {
      privacyModalEl.classList.remove("show");
      privacyModalEl.style.display = "none";
    }
  }

  linkOpenPrivacy?.addEventListener("click", e => {
    e.preventDefault();
    openPrivacyModal(null);
  });

  btnConfirmPrivacy?.addEventListener("click", () => {
    privacyAccepted = true;
    hidePrivacyModal();

    if (pendingPrivacyAction === "submit") {
      pendingPrivacyAction = null;
      submitFormazione();
    } else if (pendingPrivacyAction === "download") {
      pendingPrivacyAction = null;
      downloadJsonFile();
    }
  });

  // --------------------------------------------------------------------------
  // STEP 1: GESTIONE DISTINTA
  // --------------------------------------------------------------------------
  function markDuplicates() {
    const counts = {};
    roster.forEach(p => {
      if (p.number != null) counts[p.number] = (counts[p.number] || 0) + 1;
    });

    roster.forEach(p => {
      const input = rosterWrap.querySelector(`input.roster-input-num[data-id="${p.id}"]`);
      if (input) {
        const isDup = p.number != null && counts[p.number] > 1;
        input.classList.toggle("dup", isDup);
        input.title = isDup ? "Attenzione: numero di maglia duplicato" : "";
      }
    });
  }

  function renderRoster() {
    rosterWrap.innerHTML = "";

    roster.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "roster-row";
      if (lineup.includes(p.id)) {
        row.classList.add("is-assigned");
      }

      const indexBadge = document.createElement("span");
      indexBadge.className = "roster-index";
      indexBadge.textContent = `#${idx + 1}`;

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "roster-input-name";
      nameInput.placeholder = "Cognome e Nome";
      nameInput.value = p.name || "";
      nameInput.dataset.id = p.id;
      nameInput.dataset.field = "name";
      nameInput.maxLength = 80;

      const numInput = document.createElement("input");
      numInput.type = "number";
      numInput.className = "roster-input-num";
      numInput.placeholder = "N°";
      numInput.min = "1";
      numInput.max = "99";
      numInput.inputMode = "numeric";
      numInput.value = p.number ?? "";
      numInput.dataset.id = p.id;
      numInput.dataset.field = "num";

      const capBtn = document.createElement("button");
      capBtn.type = "button";
      capBtn.className = "roster-cap-btn" + (p.id === captainId ? " active" : "");
      capBtn.textContent = "C";
      capBtn.title = "Capitano";
      capBtn.setAttribute("aria-label", "Imposta come capitano");
      capBtn.setAttribute("aria-pressed", String(p.id === captainId));
      capBtn.dataset.id = p.id;

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "roster-del-btn";
      delBtn.title = "Rimuovi riga";
      delBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
      delBtn.dataset.id = p.id;

      row.append(indexBadge, nameInput, numInput, capBtn, delBtn);
      rosterWrap.appendChild(row);
    });

    markDuplicates();
    updateCounts();
  }

  function commitField(input) {
    if (!input || !input.dataset.id) return;
    const id = input.dataset.id;
    const field = input.dataset.field;
    const item = roster.find(p => p.id === id);
    if (!item) return;

    if (field === "name") {
      item.name = input.value.trim();
    } else if (field === "num") {
      item.number = toNumber(input.value);
    }

    if (captainId === id && !hasData(item)) {
      captainId = null;
      const b = rosterWrap.querySelector(`.roster-cap-btn[data-id="${id}"]`);
      b?.classList.remove("active");
      b?.setAttribute("aria-pressed", "false");
    }

    markDuplicates();
    renderPitch();
    renderBench();
    updateCounts();
  }

  function addPlayerRow(autoFocus = true) {
    const newPlayer = { id: newId(), name: "", number: null };
    roster.push(newPlayer);
    renderRoster();
    if (autoFocus) {
      const input = rosterWrap.querySelector(`input.roster-input-name[data-id="${newPlayer.id}"]`);
      if (input) {
        input.focus();
        input.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }

  function removePlayer(id) {
    roster = roster.filter(p => p.id !== id);
    if (captainId === id) captainId = null;
    lineup = lineup.map(slotId => (slotId === id ? null : slotId));
    if (roster.length === 0) {
      addPlayerRow(false);
    }
    renderRoster();
    renderPitch();
    renderBench();
  }

  function sortRoster() {
    roster.sort((a, b) => {
      const numA = a.number ?? 999;
      const numB = b.number ?? 999;
      if (numA !== numB) return numA - numB;
      return (a.name || "").localeCompare(b.name || "");
    });
    renderRoster();
    renderPitch();
    renderBench();
  }

  function clearRoster() {
    if (!confirm("Svuotare tutta la distinta e azzerare il campo?")) return;
    roster = Array.from({ length: DEFAULT_ROSTER_SIZE }, () => ({
      id: newId(),
      name: "",
      number: null
    }));
    lineup = Array(SLOTS_COUNT).fill(null);
    captainId = null;
    renderRoster();
    renderPitch();
    renderBench();
  }

  // Eventi distinta
  rosterWrap.addEventListener("input", e => {
    if (e.target.matches("input")) {
      commitField(e.target);
    }
  });

  rosterWrap.addEventListener("change", e => {
    if (e.target.matches("input")) {
      commitField(e.target);
    }
  });

  rosterWrap.addEventListener("keydown", e => {
    if (e.key !== "Enter" || !e.target.dataset.field) return;
    e.preventDefault();
    commitField(e.target);

    const id = e.target.dataset.id;
    if (e.target.dataset.field === "name") {
      const numEl = rosterWrap.querySelector(`input.roster-input-num[data-id="${id}"]`);
      numEl?.focus();
    } else if (e.target.dataset.field === "num") {
      const idx = roster.findIndex(p => p.id === id);
      const next = roster[idx + 1];
      if (next) {
        const nextName = rosterWrap.querySelector(`input.roster-input-name[data-id="${next.id}"]`);
        nextName?.focus();
      } else {
        addPlayerRow(true);
      }
    }
  });

  rosterWrap.addEventListener("click", e => {
    const cap = e.target.closest(".roster-cap-btn");
    if (!cap) return;
    const player = roster.find(p => p.id === cap.dataset.id);
    if (!player || !hasData(player)) return; // serve almeno nome o numero
    captainId = captainId === player.id ? null : player.id;
    renderRoster();
    renderPitch();
    renderBench();
  });

  rosterWrap.addEventListener("click", e => {
    const btn = e.target.closest(".roster-del-btn");
    if (!btn || !btn.dataset.id) return;
    removePlayer(btn.dataset.id);
  });

  document.getElementById("btn-add-player")?.addEventListener("click", () => addPlayerRow(true));
  document.getElementById("btn-sort-roster")?.addEventListener("click", sortRoster);
  document.getElementById("btn-clear-roster")?.addEventListener("click", clearRoster);

  // --------------------------------------------------------------------------
  // STEP 2: CAMPO E SCHIERAMENTO
  // --------------------------------------------------------------------------
  let slotEls = [];
  let currentFormation = moduloSelect.value || "4-3-3";

  function buildPitchSlots() {
    slotEls.forEach(el => el.remove());
    const coords = pitchCoords(currentFormation);

    slotEls = coords.map(([x, y], idx) => {
      const el = document.createElement("div");
      el.className = "pitch-slot empty";
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      el.dataset.slot = String(idx);

      const shirt = document.createElement("div");
      shirt.className = "pitch-shirt";
      shirt.textContent = "+";

      const nameLabel = document.createElement("div");
      nameLabel.className = "pitch-slot-name";

      el.append(shirt, nameLabel);
      pitchWrap.appendChild(el);
      return el;
    });
  }

  function renderPitch() {
    const formation = moduloSelect.value || "4-3-3";
    if (formation !== currentFormation || slotEls.length !== SLOTS_COUNT) {
      currentFormation = formation;
      buildPitchSlots();
    }

    if (pitchBadge) pitchBadge.textContent = currentFormation;

    const byId = new Map(roster.map(p => [p.id, p]));
    let filled = 0;

    slotEls.forEach((el, idx) => {
      const playerId = lineup[idx];
      const player = playerId ? byId.get(playerId) : null;
      const shirt = el.querySelector(".pitch-shirt");
      const nameEl = el.querySelector(".pitch-slot-name");

      if (player && (player.name || player.number != null)) {
        filled++;
        el.classList.remove("empty");
        shirt.textContent = player.number != null ? player.number : "•";
        nameEl.textContent = player.name || `N° ${player.number}`;
        nameEl.title = `${player.name || ""} (N° ${player.number ?? "-"})`;
      } else {
        el.classList.add("empty");
        shirt.textContent = "+";
        nameEl.textContent = "";
        nameEl.title = "";
      }

      shirt.classList.toggle("is-captain", !!player && player.id === captainId && !el.classList.contains("empty"));
    });

    if (startersCountEl) startersCountEl.textContent = `${filled} / ${SLOTS_COUNT}`;
    updateCounts();
  }

  moduloSelect.addEventListener("change", () => {
    currentFormation = moduloSelect.value;
    buildPitchSlots();
    renderPitch();
  });

  pitchWrap.addEventListener("click", e => {
    const slot = e.target.closest(".pitch-slot");
    if (!slot) return;
    openPickModal(Number(slot.dataset.slot));
  });

  document.getElementById("btn-clear-pitch")?.addEventListener("click", () => {
    if (!lineup.some(Boolean)) return;
    if (!confirm("Rimuovere tutti i giocatori schierati in campo? (La distinta rimarrà intatta)")) return;
    lineup = Array(SLOTS_COUNT).fill(null);
    renderPitch();
    renderBench();
    renderRoster();
  });

  document.getElementById("btn-autofill-pitch")?.addEventListener("click", () => {
    const valid = roster.filter(hasData);
    if (!valid.length) {
      alert("Inserisci prima i giocatori nella distinta.");
      return;
    }
    lineup = Array(SLOTS_COUNT).fill(null);
    valid.slice(0, SLOTS_COUNT).forEach((p, idx) => {
      lineup[idx] = p.id;
    });
    renderPitch();
    renderBench();
    renderRoster();
  });

  // --------------------------------------------------------------------------
  // MODALE SCELTA GIOCATORE PER LO SLOT
  // --------------------------------------------------------------------------
  function openPickModal(slotIdx) {
    currentPickSlot = slotIdx;
    pickModalList.innerHTML = "";

    const roleName = deduceRole(slotIdx, currentFormation);
    pickModalTitle.textContent = slotIdx === 0
        ? "Chi gioca in porta? (Portiere)"
        : `Chi gioca qui? (${roleName})`;

    const validPlayers = roster.filter(hasData);
    const unassigned = validPlayers.filter(p => !lineup.includes(p.id));
    const assigned = validPlayers.filter(p => lineup.includes(p.id) && lineup[slotIdx] !== p.id);
    const currentOccupant = lineup[slotIdx];

    // Pulsante per svuotare la posizione
    if (currentOccupant) {
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "pick-row clear-btn";
      clearBtn.innerHTML = '<i class="bi bi-trash3 me-2"></i> Svuota questa posizione';
      clearBtn.onclick = () => {
        lineup[currentPickSlot] = null;
        closePickModal();
        renderPitch();
        renderBench();
        renderRoster();
      };
      pickModalList.appendChild(clearBtn);
    }

    // Giocatori non ancora schierati (dalla distinta)
    if (unassigned.length) {
      const section = document.createElement("div");
      section.className = "pick-section-title";
      section.textContent = "Dalla distinta (non schierati)";
      pickModalList.appendChild(section);

      unassigned.forEach(p => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "pick-row";
        row.innerHTML = `
          <span class="pick-row-num">${p.number ?? "-"}</span>
          <span class="pick-row-name">${p.name || "(senza nome)"}</span>
        `;
        row.onclick = () => {
          lineup[currentPickSlot] = p.id;
          closePickModal();
          renderPitch();
          renderBench();
          renderRoster();
        };
        pickModalList.appendChild(row);
      });
    }

    // Giocatori già in campo (permette lo scambio di posizione)
    if (assigned.length) {
      const section = document.createElement("div");
      section.className = "pick-section-title";
      section.textContent = "Già in campo (tocca per scambiare)";
      pickModalList.appendChild(section);

      assigned.forEach(p => {
        const fromSlot = lineup.indexOf(p.id);
        const fromRole = deduceRole(fromSlot, currentFormation);
        const row = document.createElement("button");
        row.type = "button";
        row.className = "pick-row";
        row.innerHTML = `
          <span class="pick-row-num">${p.number ?? "-"}</span>
          <span class="pick-row-name">${p.name || "(senza nome)"}</span>
          <span class="pick-row-tag">${fromRole} (scambia)</span>
        `;
        row.onclick = () => {
          // Scambio
          lineup[fromSlot] = lineup[currentPickSlot];
          lineup[currentPickSlot] = p.id;
          closePickModal();
          renderPitch();
          renderBench();
          renderRoster();
        };
        pickModalList.appendChild(row);
      });
    }

    if (!validPlayers.length) {
      const msg = document.createElement("p");
      msg.className = "text-secondary small text-center my-3";
      msg.textContent = "Nessun giocatore inserito. Compila prima la distinta a sinistra con nomi e numeri.";
      pickModalList.appendChild(msg);
    }

    pickModal.classList.add("active");
  }

  function closePickModal() {
    pickModal.classList.remove("active");
    currentPickSlot = null;
  }

  pickModalClose?.addEventListener("click", closePickModal);
  pickModal?.addEventListener("click", e => {
    if (e.target === pickModal) closePickModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && pickModal.classList.contains("active")) {
      closePickModal();
    }
  });

  // --------------------------------------------------------------------------
  // PANCHINA AUTOMATICA & CONTATORI
  // --------------------------------------------------------------------------
  function renderBench() {
    benchWrap.innerHTML = "";
    const benchPlayers = roster
        .filter(p => hasData(p) && !lineup.includes(p.id))
        .sort((a, b) => (a.number ?? 999) - (b.number ?? 999));

    if (!benchPlayers.length) {
      const emptySpan = document.createElement("span");
      emptySpan.className = "bench-empty";
      const totalValid = roster.filter(hasData).length;
      emptySpan.textContent = totalValid > 0
          ? "Tutti i giocatori compilati sono attualmente schierati in campo."
          : "Compila la distinta per visualizzare la panchina.";
      benchWrap.appendChild(emptySpan);
      return;
    }

    benchPlayers.forEach(p => {
      const chip = document.createElement("div");
      chip.className = "bench-chip";
      chip.innerHTML = `
        <span class="bench-chip-num">${p.number ?? "-"}</span>
        <span>${p.name || "(senza nome)"}</span>
        ${p.id === captainId ? '<span class="cap-tag" title="Capitano">C</span>' : ""}
      `;
      benchWrap.appendChild(chip);
    });
  }

  function updateCounts() {
    const validCount = roster.filter(hasData).length;
    const startersCount = lineup.filter(Boolean).length;
    const benchCount = Math.max(0, validCount - startersCount);

    if (rosterCountBadge) rosterCountBadge.textContent = `${validCount} compilati`;
    if (benchCountBadge) benchCountBadge.textContent = `${benchCount} riserve`;
  }

  // --------------------------------------------------------------------------
  // PAYLOAD GENERATION & JSON
  // --------------------------------------------------------------------------
  function buildPayload() {
    const modulo = moduloSelect.value.trim();
    const byId = new Map(roster.map(p => [p.id, p]));

    // 1. Titolari ordinati per slot (0..10)
    const titolari = [];
    lineup.forEach((id, slotIdx) => {
      if (!id) return;
      const p = byId.get(id);
      if (!p) return;
      titolari.push({
        id: p.id,
        nome: (p.name || "").trim(),
        numeroMaglia: p.number,
        ruolo: deduceRole(slotIdx, modulo),
        titolare: true,
        slot: slotIdx,
        capitano: p.id === captainId
      });
    });

    // 2. Riserve (non schierati ma in distinta con dati)
    const riserve = roster
        .filter(p => hasData(p) && !lineup.includes(p.id))
        .map(p => ({
          id: p.id,
          nome: (p.name || "").trim(),
          numeroMaglia: p.number,
          ruolo: "Centrocampista", // Ruolo default compatibile per panchinari
          titolare: false,
          slot: null,
          capitano: p.id === captainId
        }));

    // Elenco unificato dei giocatori per compatibilità con il backend Apps Script
    const giocatori = [...titolari, ...riserve];

    // Coordinate esatte per atv_obs
    const coords = pitchCoords(modulo);
    const schieramento = lineup.map((id, idx) => {
      const p = id ? byId.get(id) : null;
      return {
        slot: idx,
        x: coords[idx] ? coords[idx][0] : null,
        y: coords[idx] ? coords[idx][1] : null,
        ruolo: deduceRole(idx, modulo),
        giocatore: p
            ? { id: p.id, nome: p.name.trim(), numeroMaglia: p.number, capitano: p.id === captainId }
            : null
      };
    });

    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      inviatoIl: now,
      squadraAvversaria: document.getElementById("squadra").value.trim(),
      modulo,
      mister: document.getElementById("mister")?.value.trim() || "",
      noteTattiche: "",
      giocatori,
      schieramento,
      panchina: riserve,
      privacy: {
        accettata: privacyAccepted,
        accettataIl: now
      },
      website: document.getElementById("website").value
    };
  }

  // --------------------------------------------------------------------------
  // DOWNLOAD JSON
  // --------------------------------------------------------------------------
  function downloadJsonFile() {
    const payload = buildPayload();
    delete payload.website;

    const teamName = payload.squadraAvversaria || "squadra-avversaria";
    const safeName = teamName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `formazione-${safeName}-${dateStr}.json`;

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showAlert("success", `File <strong>${fileName}</strong> scaricato correttamente!`);
  }

  document.getElementById("btn-download-json")?.addEventListener("click", () => {
    const squadra = document.getElementById("squadra").value.trim();
    if (!squadra) {
      document.getElementById("squadra").focus();
      showAlert("warning", "Inserisci il nome della squadra prima di scaricare il JSON.");
      return;
    }
    const validCount = roster.filter(hasData).length;
    if (validCount === 0) {
      showAlert("warning", "Inserisci almeno un giocatore nella distinta prima di scaricare il JSON.");
      return;
    }

    if (!privacyAccepted) {
      openPrivacyModal("download");
      return;
    }

    downloadJsonFile();
  });

  // Copia negli appunti
  document.getElementById("btn-copy-json")?.addEventListener("click", async () => {
    const payload = buildPayload();
    delete payload.website;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      showAlert("success", '<i class="bi bi-clipboard-check me-1"></i> JSON copiato negli appunti!');
    } catch {
      showAlert("secondary", "Impossibile copiare negli appunti automaticamente. Usa «Scarica JSON».");
    }
  });

  // Caricamento / import JSON
  document.getElementById("input-import-json")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.squadraAvversaria) {
          document.getElementById("squadra").value = data.squadraAvversaria;
        }
        if (data.modulo) {
          moduloSelect.value = data.modulo;
        }
        if (data.mister) {
          const misterEl = document.getElementById("mister");
          if (misterEl) misterEl.value = data.mister;
        }

        // Ripristina giocatori se presenti
        if (Array.isArray(data.giocatori) && data.giocatori.length) {
          roster = data.giocatori.map(g => ({
            id: g.id || newId(),
            name: g.nome || "",
            number: g.numeroMaglia ?? null
          }));
          const capIdx = data.giocatori.findIndex(g => g.capitano === true || g.isCaptain === true);
          captainId = capIdx >= 0 ? roster[capIdx].id : null;
          lineup = Array(SLOTS_COUNT).fill(null);
          data.giocatori.forEach(g => {
            if (g.titolare && g.slot != null && g.slot >= 0 && g.slot < SLOTS_COUNT) {
              const matched = roster.find(r => r.name === g.nome && r.number === g.numeroMaglia);
              if (matched) lineup[g.slot] = matched.id;
            }
          });
        }

        buildPitchSlots();
        renderRoster();
        renderPitch();
        renderBench();
        showAlert("success", `Dati importati con successo da <strong>${file.name}</strong>.`);
      } catch (err) {
        console.error("Errore importazione JSON:", err);
        showAlert("danger", "File JSON non valido o formato non riconosciuto.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // --------------------------------------------------------------------------
  // SUBMIT FORM E FETCH APPS SCRIPT
  // --------------------------------------------------------------------------
  function showAlert(type, msg) {
    alertBox.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show shadow-sm mb-0" role="alert">
        ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Chiudi"></button>
      </div>`;
    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    spinner.classList.toggle("d-none", !loading);
    const icon = document.getElementById("submit-icon");
    if (icon) icon.classList.toggle("d-none", loading);
  }

  async function submitFormazione() {
    alertBox.innerHTML = "";
    setLoading(true);

    try {
      const payload = buildPayload();

      console.group("Formazione avversaria - payload inviato");
      console.log("URL:", APPS_SCRIPT_URL);
      console.log("Payload:", payload);
      console.groupEnd();

      if (payload.website) {
        console.warn("Bot detected via honeypot, request blocked.");
        showAlert("success", "Formazione inviata correttamente. Grazie!");
        return;
      }
      delete payload.website;

      const payloadString = JSON.stringify(payload);
      const targetUrl = `${APPS_SCRIPT_URL}?payload=${encodeURIComponent(payloadString)}`;

      await fetch(targetUrl, {
        method: "POST",
        mode: "no-cors"
      });

      console.log("Fetch conclusa senza errore (no-cors): richiesta inviata.");

      showAlert(
          "success",
          `<strong>Formazione inviata con successo!</strong> Grazie per la collaborazione con Armatori TV.<br>
         <button type="button" id="btn-download-after-submit" class="btn btn-outline-success btn-sm mt-2">
           <i class="bi bi-download me-1"></i> Scarica una copia in JSON
         </button>`
      );

      document.getElementById("btn-download-after-submit")?.addEventListener("click", downloadJsonFile);
    } catch (err) {
      console.error(err);
      showAlert(
          "danger",
          "Errore durante l'invio. Puoi comunque cliccare su <strong>«Scarica JSON»</strong> per salvare il file e inviarcelo a armatoritv@gmail.com."
      );
    } finally {
      setLoading(false);
    }
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    alertBox.innerHTML = "";

    const validPlayers = roster.filter(hasData);
    const noPlayers = validPlayers.length === 0;
    playersError.classList.toggle("d-none", !noPlayers);

    form.classList.add("was-validated");

    if (!form.checkValidity() || noPlayers) {
      if (noPlayers) {
        showAlert("danger", "Inserisci almeno un giocatore con nome o numero nella distinta.");
      }
      return;
    }

    if (!privacyAccepted) {
      openPrivacyModal("submit");
      return;
    }

    submitFormazione();
  });

  // Primo avvio
  buildPitchSlots();
  renderRoster();
  renderPitch();
  renderBench();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFormazionePage);
} else {
  initFormazionePage();
}