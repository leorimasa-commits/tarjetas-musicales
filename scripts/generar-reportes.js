// Escanea cards/*-discografia y regenera admin/reportes.html (panel de administración
// que lee los pedidos desde Google Sheets y arma el envío al cliente).
// Correr después de agregar/quitar cualquier discografía, junto con los otros generadores.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cardsDir = path.join(root, 'cards');

// Misma URL que templates/pedido-cliente.template.html (SHEETS_WEBAPP_URL) — si cambia
// en un lado, actualizar acá también.
const SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzbbU9PD3YlOxnpBSkQUOS_rpQoRegvuSySr6AhUhCnisaCjLhiNfmO1ap41woX6l63/exec';

const slugs = fs.readdirSync(cardsDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.endsWith('-discografia'))
  .map(d => d.name)
  .sort();

const items = [];
for (const slug of slugs) {
  const indexPath = path.join(cardsDir, slug, 'index.html');
  if (!fs.existsSync(indexPath)) continue;
  const html = fs.readFileSync(indexPath, 'utf8');
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const titulo = titleMatch ? titleMatch[1] : slug;
  items.push({ slug, titulo });
}

const templatePath = path.join(root, 'templates', 'reportes.template.html');
let html = fs.readFileSync(templatePath, 'utf8');
html = html
  .replace('{{CARDS_JSON}}', JSON.stringify(items))
  .replace('{{SHEETS_WEBAPP_URL}}', SHEETS_WEBAPP_URL);

const adminDir = path.join(root, 'admin');
fs.mkdirSync(adminDir, { recursive: true });
fs.writeFileSync(path.join(adminDir, 'reportes.html'), html, 'utf8');
console.log(`✅ admin/reportes.html generado con ${items.length} discografías en el mapa de links.`);
