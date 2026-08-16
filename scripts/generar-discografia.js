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
 *       verificado del artista/sello — se muestra como link único arriba de todo)
 *
 * --baseUrl es opcional: por defecto usa "https://scanbeat.com.ar" (el dominio
 * publicado). Pasalo solo si querés generar el QR contra otro sitio (ej. de prueba).
 *
 * --max es opcional: si la discografía es muy larga, corta la lista "completa" (con
 * tapa y temas) en los primeros N discos del archivo, y el resto se muestra abajo
 * como una lista simple de links (sin tapa, sin temas, sin bajar nada de más).
 * Poné primero en --albumes los discos más importantes.
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
  const baseUrl = (args.baseUrl || 'https://scanbeat.com.ar').replace(/\/$/, '');
  const slogan = args.slogan || 'Escaneá. Escuchá. Repetí.';

  const albumesPath = path.resolve(args.albumes);
  if (!fs.existsSync(albumesPath)) {
    console.error('No se encontró el archivo de álbumes: ' + albumesPath);
    process.exit(1);
  }

  const lineas = fs.readFileSync(albumesPath, 'utf8')
    .split('\n').map(l => l.trim()).filter(Boolean);

  const maxRich = args.max ? parseInt(args.max, 10) : lineas.length;
  const lineasRicas = lineas.slice(0, maxRich);
  const lineasSimples = lineas.slice(maxRich);

  const cardDir = path.resolve(__dirname, '..', 'cards', slug);
  const coversDir = path.join(cardDir, 'covers');
  fs.mkdirSync(coversDir, { recursive: true });

  const albums = [];
  for (let i = 0; i < lineasRicas.length; i++) {
    // Formato: Título|Año|SpotifyURL[|TidalURL[|AppleMusicURL]] — los dos
    // últimos son opcionales, para artistas donde también querramos mostrar
    // esos accesos directos.
    const [titulo, anio, spotifyUrl, tidalUrl, appleMusicUrl] = lineasRicas[i].split('|').map(p => p.trim());
    console.log(`(${i + 1}/${lineasRicas.length}) Buscando portada y temas de "${titulo}"...`);
    const { albumId, coverUrl } = await fetchAlbumInfo(spotifyUrl);
    let coverFileName = '';
    if (coverUrl) {
      const imgRes = await fetch(coverUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      // Nombre estable por álbum (no por posición): si se inserta un disco en
      // el medio de la lista y se regenera, ningún archivo ya publicado
      // cambia de contenido bajo el mismo nombre (evita imágenes cacheadas
      // desactualizadas para quien ya había visitado la página).
      coverFileName = `cover-${albumId}.jpg`;
      fs.writeFileSync(path.join(coversDir, coverFileName), buf);
    }
    const tracks = await fetchAlbumTracks(albumId);
    albums.push({
      titulo, anio, spotifyUrl,
      tidalUrl: tidalUrl || '',
      appleMusicUrl: appleMusicUrl || '',
      cover: coverFileName ? `./covers/${coverFileName}` : '',
      tracks,
    });
  }

  // Discos "de más": solo título/año/links, sin bajar tapa ni temas.
  const moreAlbums = lineasSimples.map(linea => {
    const [titulo, anio, spotifyUrl, tidalUrl, appleMusicUrl] = linea.split('|').map(p => p.trim());
    return { titulo, anio, spotifyUrl, tidalUrl: tidalUrl || '', appleMusicUrl: appleMusicUrl || '' };
  });
  if (moreAlbums.length) {
    console.log(`+ ${moreAlbums.length} disco(s) más como links simples (sin tapa/temas).`);
  }

  const templatePath = path.resolve(__dirname, '..', 'templates', 'discografia.template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const escapeHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const ogDesc = `"${slogan}" — ScanBeat`;
  const ogUrl = `${baseUrl}/cards/${slug}/`;
  const firstCover = albums.find(a => a.cover)?.cover || '';
  const ogImage = firstCover ? `${baseUrl}/cards/${slug}/${firstCover.replace(/^\.\//, '')}` : '';

  if (ogImage) {
    html = html.replaceAll('<!--IF_OG_IMAGE-->', '').replaceAll('<!--/IF_OG_IMAGE-->', '');
  } else {
    html = html.replace(/<!--IF_OG_IMAGE-->[\s\S]*?<!--\/IF_OG_IMAGE-->/g, '');
  }

  html = html
    .replaceAll('{{ARTISTA}}', escapeHtml(args.artista))
    .replaceAll('{{THEME}}', tema)
    .replaceAll('{{THEME_COLOR}}', THEME_COLORS[tema] || '#000000')
    .replace('{{INTRO}}', escapeHtml(args.intro))
    .replaceAll('{{SLOGAN}}', escapeHtml(slogan))
    .replaceAll('{{OG_DESC}}', escapeHtml(ogDesc))
    .replaceAll('{{OG_IMAGE}}', escapeHtml(ogImage))
    .replaceAll('{{OG_URL}}', escapeHtml(ogUrl))
    .replace('"{{YOUTUBE_URL}}"', JSON.stringify(args.youtube || ''))
    .replace('{{ALBUMS_JSON}}', JSON.stringify(albums))
    .replace('{{MORE_ALBUMS_JSON}}', JSON.stringify(moreAlbums));

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
