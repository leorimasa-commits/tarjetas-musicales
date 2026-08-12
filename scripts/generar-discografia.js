#!/usr/bin/env node
/*
 * Genera una tarjeta de "discografía": una página con todos los discos de un artista,
 * cada uno con su tapa (traída automáticamente de Spotify) y un link para escucharlo ahí.
 *
 * Uso:
 *   node scripts/generar-discografia.js \
 *     --slug redondos-discografia \
 *     --artista "Patricio Rey y sus Redonditos de Ricota" \
 *     --tema regalo \
 *     --albumes "assets/redondos-discografia/albums.txt" \
 *     --intro "Texto corto de presentación del artista (opcional, una sola vez arriba)" \
 *     --youtube "https://youtube.com/@canaloficial" (opcional, SOLO si es un canal oficial
 *       verificado del artista/sello — se muestra como link único arriba de todo) \
 *     --baseUrl "https://usuario.github.io/tarjetas-musicales"
 *
 * El archivo de --albumes tiene una línea por disco: "Título|Año|LinkDeSpotify"
 */
const fs = require('fs');
const path = require('path');
const THEME_COLORS = require('./theme-colors');

const TEMAS = ['cumpleanos', 'fiesta', 'evento', 'regalo'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      const val = next !== undefined && !next.startsWith('--') ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function fetchAlbumInfo(spotifyUrl) {
  const idMatch = spotifyUrl.match(/album\/([a-zA-Z0-9]+)/);
  if (!idMatch) throw new Error('Link de Spotify inválido: ' + spotifyUrl);
  const albumId = idMatch[1];
  const res = await fetch(`https://open.spotify.com/album/${albumId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const html = await res.text();
  const imageMatch = html.match(/og:image" content="([^"]*)"/);
  return { albumId, coverUrl: imageMatch ? imageMatch[1] : null };
}

async function fetchAlbumTracks(albumId) {
  const res = await fetch(`https://open.spotify.com/embed/album/${albumId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const html = await res.text();
  const re = /"uri":"spotify:track:([a-zA-Z0-9]+)","uid":"[^"]*","title":"((?:[^"\\]|\\.)*)"/g;
  const tracks = [];
  let m;
  while ((m = re.exec(html))) {
    tracks.push({ title: JSON.parse('"' + m[2] + '"'), spotifyId: m[1] });
  }
  return tracks;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.artista || !args.albumes) {
    console.error('Uso: node scripts/generar-discografia.js --artista "Nombre" --albumes "archivo.txt" [--slug ...] [--tema ...] [--baseUrl ...]');
    process.exit(1);
  }

  const tema = TEMAS.includes(args.tema) ? args.tema : 'regalo';
  const slug = slugify(args.slug || args.artista + '-discografia');
  const baseUrl = (args.baseUrl || '').replace(/\/$/, '');
  const slogan = args.slogan || 'Escaneá. Escuchá. Repetí.';

  const albumesPath = path.resolve(args.albumes);
  if (!fs.existsSync(albumesPath)) {
    console.error('No se encontró el archivo de álbumes: ' + albumesPath);
    process.exit(1);
  }

  const lineas = fs.readFileSync(albumesPath, 'utf8')
    .split('\n').map(l => l.trim()).filter(Boolean);

  const cardDir = path.resolve(__dirname, '..', 'cards', slug);
  const coversDir = path.join(cardDir, 'covers');
  fs.mkdirSync(coversDir, { recursive: true });

  const albums = [];
  for (let i = 0; i < lineas.length; i++) {
    const [titulo, anio, spotifyUrl] = lineas[i].split('|').map(p => p.trim());
    console.log(`(${i + 1}/${lineas.length}) Buscando portada y temas de "${titulo}"...`);
    const { albumId, coverUrl } = await fetchAlbumInfo(spotifyUrl);
    let coverFileName = '';
    if (coverUrl) {
      const imgRes = await fetch(coverUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      coverFileName = `cover-${i}.jpg`;
      fs.writeFileSync(path.join(coversDir, coverFileName), buf);
    }
    const tracks = await fetchAlbumTracks(albumId);
    albums.push({ titulo, anio, spotifyUrl, cover: coverFileName ? `./covers/${coverFileName}` : '', tracks });
  }

  const templatePath = path.resolve(__dirname, '..', 'templates', 'discografia.template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const escapeHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  html = html
    .replaceAll('{{ARTISTA}}', escapeHtml(args.artista))
    .replaceAll('{{THEME}}', tema)
    .replace('{{INTRO}}', escapeHtml(args.intro))
    .replaceAll('{{SLOGAN}}', escapeHtml(slogan))
    .replace('"{{YOUTUBE_URL}}"', JSON.stringify(args.youtube || ''))
    .replace('{{ALBUMS_JSON}}', JSON.stringify(albums));

  fs.writeFileSync(path.join(cardDir, 'index.html'), html, 'utf8');

  console.log(`\n✅ Tarjeta de discografía creada en: cards/${slug}/`);

  if (baseUrl) {
    const finalUrl = `${baseUrl}/cards/${slug}/`;
    try {
      const QRCode = require('qrcode');
      await QRCode.toFile(path.join(cardDir, 'qr.png'), finalUrl, {
        width: 500, margin: 2,
        color: { dark: THEME_COLORS[tema] || '#000000', light: '#ffffffff' },
      });
      console.log(`🔗 URL final:   ${finalUrl}`);
      console.log(`📷 QR generado: cards/${slug}/qr.png`);
    } catch (e) {
      console.log(`🔗 URL final:   ${finalUrl}`);
      console.log('(No se pudo generar el QR: ' + e.message + ')');
    }
  } else {
    console.log('ℹ️  No pasaste --baseUrl, corré de nuevo con esa opción una vez publicado el sitio.');
  }
}

main();
