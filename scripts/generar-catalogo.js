// Escanea cards/*-discografia y regenera catalogo.html en la raíz del repo.
// Correr después de agregar/quitar cualquier discografía, antes de commitear.
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
  const indexPath = path.join(cardsDir, slug, 'index.html');
  if (!fs.existsSync(indexPath)) continue;
  const html = fs.readFileSync(indexPath, 'utf8');

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const artista = titleMatch ? titleMatch[1] : slug;

  const albumsMatch = html.match(/const ALBUMS = (\[.*?\]);/s);
  let cover = '';
  let cantidad = 0;
  if (albumsMatch) {
    try {
      const albums = JSON.parse(albumsMatch[1]);
      cantidad = albums.length;
      if (albums[0] && albums[0].cover) cover = albums[0].cover;
    } catch (e) { /* ignora si el JSON no matchea */ }
  }

  items.push({ slug, artista, cover, cantidad });
}

items.sort((a, b) => a.artista.localeCompare(b.artista, 'es', { sensitivity: 'base' }));

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const cards = items.map(it => `
    <a class="cat-item" href="pedido.html?artist=${encodeURIComponent(it.slug)}">
      <img src="cards/${it.slug}/${it.cover.replace(/^\.\//, '')}" alt="${esc(it.artista)}" loading="lazy">
      <span>${esc(it.artista)}</span>
    </a>`).join('');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Catálogo — ScanBeat</title>
<meta name="description" content="Todas las discografías disponibles en ScanBeat.">
<meta name="theme-color" content="#1a1a2e">
<style>
  :root{ --bg1:#1a1a2e; --bg2:#16213e; --accent:#e94560; --accent2:#ffd166; --text:#ffffff; }
  *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html,body{
    margin:0; padding:0; width:100%;
    background:radial-gradient(circle at 50% 0%, var(--bg2), var(--bg1));
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--text);
  }
  a{ color:inherit; text-decoration:none; }
  img{ max-width:100%; display:block; }
  header{ text-align:center; padding:44px 20px 20px; }
  header a.back{ display:inline-block; margin-bottom:14px; font-size:13px; opacity:.6; }
  h1{
    margin:0 0 8px; font-size:clamp(26px,7vw,40px); font-weight:800; letter-spacing:-.02em;
    background:linear-gradient(90deg,var(--accent),var(--accent2));
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
  header p{ margin:0; opacity:.7; font-size:14px; }
  .cat-grid{
    max-width:960px; margin:0 auto; padding:12px 20px 60px;
    display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:16px;
  }
  .cat-item{
    display:block; border-radius:14px; overflow:hidden; position:relative;
    aspect-ratio:1; background:#111; box-shadow:0 8px 20px rgba(0,0,0,.35);
  }
  .cat-item img{ width:100%; height:100%; object-fit:cover; }
  .cat-item span{
    position:absolute; left:0; right:0; bottom:0; padding:10px 8px; font-size:12px; font-weight:700;
    background:linear-gradient(to top, rgba(0,0,0,.9), transparent);
  }
  footer{ text-align:center; padding:20px 20px 48px; opacity:.5; font-size:12px; }
</style>
</head>
<body>
<header>
  <a class="back" href="./">← Volver</a>
  <h1>Catálogo</h1>
  <p>${items.length} discografías disponibles — tocá una tapa para armar tu pedido</p>
</header>
<div class="cat-grid">${cards}
</div>
<footer>ScanBeat — "Escaneá. Escuchá. Repetí."</footer>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'catalogo.html'), html);
console.log(`✅ catalogo.html generado con ${items.length} discografías.`);
