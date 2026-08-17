/**
 * ScanBeat — recibe los pedidos enviados desde pedido.html y los guarda como filas
 * en esta misma planilla de Google Sheets (hoja "Pedidos"), con el PDF del pedido
 * guardado en Google Drive y un link a cada uno.
 *
 * Ver las INSTRUCCIONES DE INSTALACIÓN al final de este archivo.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pedidos') || crearHoja_();

    var pdfUrl = '';
    if (data.pdfBase64) {
      pdfUrl = guardarPdf_(data.pdfBase64, data.nombre);
    }

    sheet.appendRow([
      new Date(),
      data.nombre || '',
      data.contacto || '',
      data.discografias || '',
      data.comentario || '',
      pdfUrl,
      false, // Pagado — se tilda a mano
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function crearHoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.insertSheet('Pedidos');
  sheet.appendRow(['Fecha', 'Nombre', 'Contacto', 'Discografías', 'Comentario', 'PDF', 'Pagado']);
  sheet.getRange('A1:G1').setFontWeight('bold');
  sheet.getRange('G2:G1000').insertCheckboxes();
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 7);
  return sheet;
}

function guardarPdf_(base64, nombre) {
  var folderName = 'Pedidos ScanBeat';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  var bytes = Utilities.base64Decode(base64);
  var nombreArchivo = 'pedido-' + (nombre || 'sin-nombre').replace(/[^a-zA-Z0-9]/g, '-') + '-' + new Date().getTime() + '.pdf';
  var blob = Utilities.newBlob(bytes, 'application/pdf', nombreArchivo);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/*
 * ======================== INSTRUCCIONES DE INSTALACIÓN ========================
 * 1. Andá a https://sheets.google.com y creá una planilla nueva (o usá una que ya tengas
 *    para esto). Le podés poner de nombre "Pedidos ScanBeat".
 * 2. Arriba, andá a Extensiones → Apps Script.
 * 3. Borrá el código de ejemplo (function myFunction(){...}) y pegá TODO este archivo
 *    en su lugar.
 * 4. Guardá el proyecto (ícono de disquete arriba, o Ctrl+S). Ponele un nombre si te
 *    lo pide, por ejemplo "Pedidos ScanBeat".
 * 5. Arriba a la derecha, tocá "Implementar" → "Nueva implementación".
 * 6. Al lado de "Selecciona el tipo" tocá el ícono de engranaje y elegí "Aplicación web".
 * 7. Configurá:
 *      - "Ejecutar como": Yo (tu cuenta de Google)
 *      - "Quién tiene acceso": Cualquier usuario
 * 8. Tocá "Implementar". Google va a pedirte autorizar el script — es tu propio script,
 *    así que es seguro. Si aparece "Google no verificó esta app" (normal para scripts
 *    personales), tocá "Avanzado" → "Ir a [nombre del proyecto] (no seguro)" → "Permitir".
 * 9. Te va a dar una "URL de la aplicación web" que termina en /exec — copiala.
 * 10. Pasame esa URL para pegarla en pedido.html (donde dice SHEETS_WEBAPP_URL) y quedar
 *     conectado. Si en algún momento reemplazás la implementación, la URL puede cambiar
 *     y hay que actualizarla ahí de nuevo.
 *
 * Cada pedido nuevo crea automáticamente la hoja "Pedidos" (si todavía no existe) y le
 * agrega una fila con: fecha, nombre, contacto, discografías elegidas, comentario, un
 * link al PDF (guardado en tu Google Drive, carpeta "Pedidos ScanBeat"), y una casilla
 * "Pagado" que tildás vos a mano cuando cobrás ese pedido.
 * ================================================================================
 */
