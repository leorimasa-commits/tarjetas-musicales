// Regenera admin/reportes.html (panel de administración que lee los pedidos desde
// la API de Cloudflare Workers y arma el envío de la hoja/PDF al cliente).
// La URL de la API ya NO se duplica acá — vive en un solo lugar: assets/api-config.js
// (que reportes.template.html carga con <script src="../assets/api-config.js">).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const templatePath = path.join(root, 'templates', 'reportes.template.html');
const html = fs.readFileSync(templatePath, 'utf8');

const adminDir = path.join(root, 'admin');
fs.mkdirSync(adminDir, { recursive: true });
fs.writeFileSync(path.join(adminDir, 'reportes.html'), html, 'utf8');
console.log('✅ admin/reportes.html generado.');
