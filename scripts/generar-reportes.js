// Regenera admin/reportes.html (panel de administración que lee los pedidos desde
// Google Sheets y arma el envío de la hoja/PDF al cliente).
// Correr de nuevo si cambia la URL del Web App de Apps Script.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// Misma URL que templates/pedido-cliente.template.html (SHEETS_WEBAPP_URL) — si cambia
// en un lado, actualizar acá también.
const SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbynSAmjU_PqVqt-9D79cd_LpblqXahZbXLS-xRpi46qRXiZ5WO7uNwWu5xYqWoavgao/exec';

const templatePath = path.join(root, 'templates', 'reportes.template.html');
let html = fs.readFileSync(templatePath, 'utf8');
html = html.replace('{{SHEETS_WEBAPP_URL}}', SHEETS_WEBAPP_URL);

const adminDir = path.join(root, 'admin');
fs.mkdirSync(adminDir, { recursive: true });
fs.writeFileSync(path.join(adminDir, 'reportes.html'), html, 'utf8');
console.log('✅ admin/reportes.html generado.');
