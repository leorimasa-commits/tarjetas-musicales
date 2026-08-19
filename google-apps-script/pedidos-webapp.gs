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

    // Acción del panel admin/pedidos.html: guardar el precio por hoja para que se
    // use como valor por defecto en todos lados (pedido.html público y el panel
    // admin), sin tener que volver a escribirlo cada vez.
    if (data.tipo === 'setConfig') {
      PropertiesService.getScriptProperties().setProperty('precioPorHoja', String(data.precioPorHoja || 0));
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Acción del panel admin/reportes.html: mandar el mail al cliente directo desde acá
    // (con tu cuenta de Gmail), sin abrir ningún programa.
    if (data.tipo === 'enviarMail') {
      MailApp.sendEmail({
        to: data.contacto,
        subject: data.asunto || 'Tu pedido de ScanBeat',
        body: data.mensaje || '',
        name: 'ScanBeat', // así lo ve el cliente en vez del Gmail personal
        replyTo: 'leorimasa@gmail.com', // no hay casilla propia del dominio (se descartó, tiene costo); si responde, cae acá
      });
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Comportamiento normal: guardar un pedido nuevo que llega desde pedido.html.
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

    // La casilla se aplica solo a la fila recién agregada (NO precargar un rango grande
    // de antemano: eso deja valores FALSE escritos en celdas vacías, y appendRow() las
    // cuenta como "ocupadas" — los pedidos terminan agregándose muy abajo en vez de justo
    // después del último real).
    sheet.getRange(sheet.getLastRow(), 7).insertCheckboxes();

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    // Acción de pedido.html (público) y admin/pedidos.html: leer el precio por
    // hoja guardado, para mostrarlo sin que el admin tenga que retipearlo.
    if (e.parameter && e.parameter.tipo === 'config') {
      var precioGuardado = PropertiesService.getScriptProperties().getProperty('precioPorHoja');
      return ContentService.createTextOutput(JSON.stringify({
        precioPorHoja: precioGuardado ? Number(precioGuardado) : 0,
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pedidos');
    if (!sheet || sheet.getLastRow() < 2) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
    var data = rows
      .filter(function (r) { return r[1] || r[2]; }) // ignora filas vacías (huérfanas de antes del fix)
      .map(function (r) {
        return {
          fecha: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
          nombre: r[1],
          contacto: r[2],
          discografias: r[3],
          comentario: r[4],
          pdf: r[5],
          pagado: r[6] === true,
        };
      })
      .reverse(); // más recientes primero
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function crearHoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.insertSheet('Pedidos');
  sheet.appendRow(['Fecha', 'Nombre', 'Contacto', 'Discografías', 'Comentario', 'PDF', 'Pagado']);
  sheet.getRange('A1:G1').setFontWeight('bold');
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
 *     conectado.
 *
 * Si en el futuro cambio este código (por ejemplo para arreglar algo), tenés que volver
 * a pegarlo en el editor y ACTUALIZAR la implementación existente para que tome el
 * cambio — no alcanza con guardar:
 *   Implementar → Administrar implementaciones → ícono de lápiz (editar) en la
 *   implementación activa → en "Versión" elegí "Nueva versión" → Implementar.
 * Así la URL sigue siendo la misma (no hace falta pasarme una nueva) pero ya corre el
 * código actualizado.
 *
 * Cada pedido nuevo crea automáticamente la hoja "Pedidos" (si todavía no existe) y le
 * agrega una fila con: fecha, nombre, contacto, discografías elegidas, comentario, un
 * link al PDF (guardado en tu Google Drive, carpeta "Pedidos ScanBeat"), y una casilla
 * "Pagado" que tildás vos a mano cuando cobrás ese pedido.
 *
 * Esta misma URL (la que termina en /exec) también sirve para LEER los pedidos: el panel
 * admin/reportes.html la usa (con GET) para mostrar la lista de pedidos y armar el envío
 * al cliente. No hace falta ninguna URL ni implementación aparte para eso.
 *
 * También manda mails directo desde tu cuenta de Gmail (MailApp) cuando tocás "Enviar
 * tarjetas al cliente" en admin/reportes.html para un contacto con @ — no abre ningún
 * programa, se manda solo. La primera vez que actualices a esta versión, al redesplegar
 * Google puede volver a pedirte autorización (porque ahora el script también necesita
 * permiso para mandar mails en tu nombre) — es el mismo paso de "Avanzado → Ir a...
 * → Permitir" de siempre.
 *
 * También guarda el "precio por hoja" (con PropertiesService, no ocupa ninguna celda de
 * la planilla) cuando lo cambiás desde admin/pedidos.html — y lo expone con GET
 * (?tipo=config) para que tanto pedido.html (público) como el panel admin lo lean solos,
 * sin que tengas que volver a escribirlo en cada lugar.
 * ================================================================================
 */
