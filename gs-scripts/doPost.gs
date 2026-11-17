// ID del tuo Google Sheet
const SPREADSHEET_ID = "1UOU7yD-jcb_NTqtE7xXA5OgTyOcrtE6UiW-XacBWcUE";

function doPost(e) {
  try {
    var data = {};

    // Legge i dati sia se passati via parametro URL che tramite POST body
    if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    // Apre direttamente il tuo foglio tramite l'ID
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getActiveSheet(); // Prende la prima tab in basso a sinistra

    var timestamp = new Date();
    var jsonFormazione = JSON.stringify(data, null, 2);

    sheet.appendRow([
      timestamp,
      data.squadraAvversaria || "Non specificato",
      data.modulo || "Non specificato",
      jsonFormazione
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}