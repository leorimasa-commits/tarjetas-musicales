// Escanea cards/*-discografia y regenera pedido.html (formulario público para que
// los clientes armen su pedido — envía un email vía FormSubmit.co, no imprime nada).
// Correr después de agregar/quitar cualquier discografía, junto con generar-catalogo.js.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cardsDir = path.join(root, 'cards');

const slugs = fs.readdirSync(cardsDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.endsWith('-discografia'))
  .map(d => d.name)
  .sort();

const items = [];
for (const slug of slugs) {
  const cardDir = path.join(cardsDir, slug);
  const indexPath = path.join(cardDir, 'index.html');
  if (!fs.existsSync(indexPath)) continue;
  const html = fs.readFileSync(indexPath, 'utf8');

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const titulo = titleMatch ? titleMatch[1] : slug;

  const temaMatch = html.match(/setAttribute\('data-theme',\s*"([^"]+)"/);
  const tema = temaMatch ? temaMatch[1] : 'regalo';

  let cover = '';
  const albumsMatch = html.match(/const ALBUMS = (\[.*?\]);/s);
  if (albumsMatch) {
    try {
      const albums = JSON.parse(albumsMatch[1]);
      const primerCover = albums.find(a => a.cover)?.cover;
      if (primerCover) cover = `cards/${slug}/${primerCover.replace(/^\.\//, '')}`;
    } catch { /* sin tapa si no matchea */ }
  }

  const qrPath = path.join(cardDir, 'qr.png');
  const qr = fs.existsSync(qrPath) ? `cards/${slug}/qr.png` : '';

  items.push({ slug, titulo, tema, cover, qr });
}

items.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }));

const templatePath = path.join(root, 'templates', 'pedido-cliente.template.html');
let html = fs.readFileSync(templatePath, 'utf8');
html = html.replace('{{CARDS_JSON}}', JSON.stringify(items));

fs.writeFileSync(path.join(root, 'pedido.html'), html, 'utf8');
console.log(`✅ pedido.html generado con ${items.length} discografías.`);
