// Escanea cards/*/index.html y regenera pedidos.html (panel de administración
// para armar hojas imprimibles a pedido, eligiendo qué tarjetas van en cada una).
// Correr después de agregar/quitar cualquier tarjeta, antes de commitear —
// mismo criterio que scripts/generar-catalogo.js.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cardsDir = path.join(root, 'cards');

const slugs = fs.readdirSync(cardsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

const items = [];
for (const slug of slugs) {
  const cardDir = path.join(cardsDir, slug);
  const indexPath = path.join(cardDir, 'index.html');
  const qrPath = path.join(cardDir, 'qr.png');
  if (!fs.existsSync(indexPath) || !fs.existsSync(qrPath)) continue;

  const html = fs.readFileSync(indexPath, 'utf8');

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const titulo = titleMatch ? titleMatch[1] : slug;

  const temaMatch = html.match(/setAttribute\('data-theme',\s*"([^"]+)"/);
  const tema = temaMatch ? temaMatch[1] : 'regalo';

  // Rutas relativas a admin/pedidos.html (un nivel más adentro que la raíz del repo).
  let cover = '';
  const candidatos = ['cover.jpg', 'cover.png', 'cover.jpeg'];
  const encontrada = candidatos.find(c => fs.existsSync(path.join(cardDir, c)));
  if (encontrada) {
    cover = `../cards/${slug}/${encontrada}`;
  } else {
    const m = html.match(/const ALBUMS = (\[.*?\]);/s);
    if (m) {
      try {
        const albums = JSON.parse(m[1]);
        const primerCover = albums.find(a => a.cover)?.cover;
        if (primerCover) cover = `../cards/${slug}/${primerCover.replace(/^\.\//, '')}`;
      } catch { /* sin tapa si no matchea */ }
    }
  }

  let cantidad = 1;
  const albumsMatch = html.match(/const ALBUMS = (\[.*?\]);/s);
  if (albumsMatch) {
    try { cantidad = JSON.parse(albumsMatch[1]).length; } catch { /* deja 1 */ }
  }

  items.push({
    slug, titulo, tema, cantidad,
    qr: `../cards/${slug}/qr.png`,
    cover,
  });
}

items.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }));

const templatePath = path.join(root, 'templates', 'pedidos.template.html');
let html = fs.readFileSync(templatePath, 'utf8');
html = html.replace('{{CARDS_JSON}}', JSON.stringify(items));

const adminDir = path.join(root, 'admin');
fs.mkdirSync(adminDir, { recursive: true });
fs.writeFileSync(path.join(adminDir, 'pedidos.html'), html, 'utf8');
console.log(`✅ admin/pedidos.html generado con ${items.length} tarjetas disponibles.`);
