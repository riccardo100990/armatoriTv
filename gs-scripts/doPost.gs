// ============================================================================
// Apps Script formazioni - Armatori TV
//  - doPost: riceve la formazione dal sito e la salva come FILE JSON in una
//            cartella di Drive (un file per invio). Tiene anche la riga sul foglio.
//  - doGet : usato dal pannello (control.html) per elencare e scaricare i file.
//
// Dopo aver incollato il codice:
//  1) Dal menu delle funzioni scegli "autorizza" ed eseguila una volta (serve il
//     permesso per Drive). Se vuoi portare dentro anche le formazioni già nel
//     foglio, esegui anche "importaDalFoglio".
//  2) Distribuisci > Gestisci distribuzioni > matita > Versione: "Nuova versione".
//     L'URL resta lo stesso.
// ============================================================================

const SPREADSHEET_ID = "1UOU7yD-jcb_NTqtE7xXA5OgTyOcrtE6UiW-XacBWcUE";
const FOLDER_NAME = "Formazioni Armatori TV";   // cartella creata da sola al primo uso
const EMAIL_AVVISO = "";                         // vuoto = il tuo account (quello che possiede lo script)

// ---------------------------------------------------------------- cartella
// Se hai già una cartella, metti qui il suo ID e verrà usata al posto di crearne una.
const FOLDER_ID_OVERRIDE = "";

function getFolder_() {
  if (FOLDER_ID_OVERRIDE) return DriveApp.getFolderById(FOLDER_ID_OVERRIDE);
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("FOLDER_ID");
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (_) { /* cartella eliminata: ne crea una nuova */ }
  }
  const folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty("FOLDER_ID", folder.getId());
  return folder;
}

function fileName_(date, squadra) {
  const clean = String(squadra || "").replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "formazione";
  return Utilities.formatDate(date, "Europe/Rome", "yyyyMMdd-HHmmss") + "_" + clean + ".json";
}

// ---------------------------------------------------------------- doPost
function doPost(e) {
  try {
    var data = {};

    // Legge i dati sia se passati via parametro URL che tramite POST body
    if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    var timestamp = new Date();
    var jsonFormazione = JSON.stringify(data, null, 2);

    // 1) Riga sul foglio (archivio): prima di tutto, così non si perde mai un invio
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    sheet.appendRow([
      timestamp,
      data.squadraAvversaria || "Non specificato",
      data.modulo || "Non specificato",
      jsonFormazione
    ]);
    var row = sheet.getLastRow();

    // 2) File JSON in Drive (è quello che legge il pannello)
    var file = null;
    try {
      file = getFolder_().createFile(
        fileName_(timestamp, data.squadraAvversaria),
        jsonFormazione,
        "application/json"
      );
    } catch (fileErr) {
      console.error("File JSON non salvato: " + fileErr);
      sheet.getRange(row, 5).setValue("ERRORE FILE: " + fileErr);   // lo vedi subito sul foglio
    }

    // 3) Email di avviso (se fallisce, l'invio resta valido)
    try {
      notifica_(data, file);
    } catch (mailErr) {
      console.error("Email non inviata: " + mailErr);
    }

    return json_({ status: "success" });

  } catch (error) {
    console.error("doPost errore: " + error);          // visibile in "Esecuzioni"
    return json_({ status: "error", message: error.toString() });
  }
}

// ---------------------------------------------------------------- email
function notifica_(data, file) {
  const to = EMAIL_AVVISO || Session.getEffectiveUser().getEmail();
  if (!to) throw new Error("Nessun indirizzo per l'avviso: scrivilo in EMAIL_AVVISO");

  const giocatori = Array.isArray(data.giocatori) ? data.giocatori : [];
  const titolari = giocatori.filter(function (g) { return g.titolare; }).length;
  const squadra = data.squadraAvversaria || "squadra non indicata";
  const righe = [
    "Nuova formazione ricevuta da " + squadra,
    "",
    "Modulo: " + (data.modulo || "-"),
    "Mister: " + (data.mister || "-"),
    "Giocatori: " + giocatori.length + " (titolari: " + titolari + ")",
    file ? "File: " + file.getUrl() : "File JSON non salvato (controlla il foglio, colonna E)"
  ];
  MailApp.sendEmail({
    to: to,
    subject: "Formazione ricevuta: " + squadra,
    body: righe.join("\n")
  });
}

// ---------------------------------------------------------------- doGet
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (!p.key || p.key !== ADMIN_KEY) return json_({ error: "Chiave non valida" });
    const folder = getFolder_();

    // ?action=get&id=...  -> contenuto di una formazione
    if (p.action === "get") {
      const f = DriveApp.getFileById(p.id);
      let inFolder = false;
      const parents = f.getParents();
      while (parents.hasNext()) if (parents.next().getId() === folder.getId()) inFolder = true;
      if (!inFolder) return json_({ error: "File non trovato" });
      return json_(JSON.parse(f.getBlob().getDataAsString("UTF-8")));
    }

    // ?action=list  -> ultime 15 formazioni ricevute
    const files = [];
    const it = folder.getFiles();
    while (it.hasNext()) {
      const f = it.next();
      if (/\.json$/i.test(f.getName())) files.push(f);
    }
    files.sort((a, b) => b.getDateCreated() - a.getDateCreated());
    const items = files.slice(0, 15).map(f => {
      let squadra = "";
      try { squadra = JSON.parse(f.getBlob().getDataAsString("UTF-8")).squadraAvversaria || ""; } catch (_) {}
      return {
        id: f.getId(),
        name: f.getName(),
        squadra: squadra,
        date: Utilities.formatDate(f.getDateCreated(), "Europe/Rome", "dd/MM HH:mm")
      };
    });
    return json_({ items: items });

  } catch (err) {
    return json_({ error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------- utilità (da eseguire a mano)

// Prova l'email subito dall'editor: se qualcosa non va, l'errore compare qui sotto.
function provaEmail() {
  notifica_({ squadraAvversaria: "PROVA", modulo: "4-3-3", mister: "Mister di prova", giocatori: [{ titolare: true }] }, null);
  Logger.log("Email inviata a " + (EMAIL_AVVISO || Session.getEffectiveUser().getEmail()));
}

// Serve solo per far comparire la richiesta di autorizzazione di Drive.
function autorizza() {
  Logger.log("Cartella: " + getFolder_().getUrl());
  Logger.log("Email, quota giornaliera residua: " + MailApp.getRemainingDailyQuota());   // fa chiedere il permesso per le email
}

// Facoltativa: converte in file JSON le formazioni già presenti nel foglio.
// Si può eseguire una volta sola (se rilanciata salta quelle già convertite).
function importaDalFoglio() {
  const folder = getFolder_();
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  let creati = 0;
  rows.forEach(function (r) {
    const when = r[0] instanceof Date ? r[0] : null;
    const json = r[3];
    if (!when || !json) return;
    const name = fileName_(when, r[1]);
    if (folder.getFilesByName(name).hasNext()) return;
    try {
      JSON.parse(json);                       // salta righe con JSON non valido
      folder.createFile(name, String(json), "application/json");
      creati++;
    } catch (_) {}
  });
  Logger.log("File creati: " + creati);
}