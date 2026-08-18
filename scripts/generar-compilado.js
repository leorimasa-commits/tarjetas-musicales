#!/usr/bin/env node
/*
 * Genera una tarjeta de "compilado": una playlist temática (varios artistas) en vez de
 * la discografía de un solo artista. Reusa el mismo template de tarjeta simple
 * (card.template.html) — portada + botones a Spotify/Tidal/Apple Music + lista opcional
 * de temas destacados.
 *
 * Uso:
 *   node scripts/generar-compilado.js \
 *     --slug hits-80s \
 *     --titulo "Grandes Éxitos 80s" \
 *     --tema fiesta \
 *     --intro "20 hits imperdibles de la década que no pasa de moda" \
 *     --spotify "https://open.spotify.com/playlist/XXXX" \
 *     --tidal "https://tidal.com/playlist/XXXX" \
 *     --apple "https://music.apple.com/us/playlist/XXXX" \
 *     --temas "assets/hits-80s/temas.txt" (opcional: un tema por línea, "Título|Artista")
 *
 * La portada se trae automáticamente del link de Spotify (og:image de la playlist),
 * igual que se hace con las tapas de álbum en generar-discografia.js. Si no pasás
 * --spotify, podés indicar una imagen manual con --cover ./archivo.jpg.
 *
 * --baseUrl es opcional: por defecto usa "https://scanbeat.com.ar".
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

async function fetchPlaylistCover(spotifyUrl) {
  const idMatch = spotifyUrl.match(/playlist\/([a-zA-Z0-9]+)/);
  if (!idMatch) return null;
  const res = await fetch(`https://open.spotify.com/playlist/${idMatch[1]}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const html = await res.text();
  const imageMatch = html.match(/og:image" content="([^"]*)"/);
  return imageMatch ? imageMatch[1] : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.config) {
    const configPath = path.resolve(args.config);
    const fileArgs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    Object.assign(args, fileArgs, args);
    delete args.config;
  }

  if (!args.titulo) {
    console.error('Uso: node scripts/generar-compilado.js --titulo "Nombre del compilado" [--slug ...] [--tema ...] [--intro ...] [--spotify ...] [--tidal ...] [--apple ...] [--temas archivo.txt] [--cover ./manual.jpg]');
    process.exit(1);
  }

  const tema = TEMAS.includes(args.tema) ? args.tema : 'regalo';
  const slug = slugify(args.slug || args.titulo);
  const baseUrl = (args.baseUrl || 'https://scanbeat.com.ar').replace(/\/$/, '');
  const slogan = args.slogan || 'Escaneá. Escuchá. Repetí.';

  const cardDir = path.resolve(__dirname, '..', 'cards', slug);
  fs.mkdirSync(cardDir, { recursive: true });

  // --- Portada: automática desde Spotify, o manual con --cover ---
  let coverFileName = '';
  if (args.cover) {
    const coverSrcPath = path.resolve(args.cover);
    if (!fs.existsSync(coverSrcPath)) {
      console.error(`No se encontró la imagen de portada: ${coverSrcPath}`);
      process.exit(1);
    }
    coverFileName = 'cover' + (path.extname(coverSrcPath) || '.jpg');
    fs.copyFileSync(coverSrcPath, path.join(cardDir, coverFileName));
  } else if (args.spotify) {
    console.log('Buscando portada de la playlist en Spotify...');
    const coverUrl = await fetchPlaylistCover(args.spotify);
    if (coverUrl) {
      const imgRes = await fetch(coverUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      coverFileName = 'cover.jpg';
      fs.writeFileSync(path.join(cardDir, coverFileName), buf);
    } else {
      console.log('No se pudo traer la portada automáticamente (pasá --cover con una imagen manual).');
    }
  }

  // --- Temas destacados (opcional, solo texto, sin buscar cada uno) ---
  let tracklist = [];
  if (args.temas) {
    const temasPath = path.resolve(args.temas);
    if (!fs.existsSync(temasPath)) {
      console.error(`No se encontró el archivo de temas: ${temasPath}`);
      process.exit(1);
    }
    tracklist = fs.readFileSync(temasPath, 'utf8')
      .split('\n').map(l => l.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean)
      .map(l => {
        const [titulo, artista] = l.split('|').map(p => p.trim());
        return { title: artista ? `${titulo} — ${artista}` : titulo };
      });
  }

  const templatePath = path.resolve(__dirname, '..', 'templates', 'card.template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const escapeHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escapeJs = (s) => JSON.stringify(String(s || ''));

  // Nunca hay audio propio en un compilado.
  html = html.replace(/<!--IF_AUDIO-->[\s\S]*?<!--\/IF_AUDIO-->/g, '');

  const ogDesc = `"${slogan}" — ScanBeat`;
  const ogUrl = `${baseUrl}/cards/${slug}/`;
  const ogImage = coverFileName ? `${baseUrl}/cards/${slug}/${coverFileName}` : '';
  if (ogImage) {
    html = html.replaceAll('<!--IF_OG_IMAGE-->', '').replaceAll('<!--/IF_OG_IMAGE-->', '');
  } else {
    html = html.replace(/<!--IF_OG_IMAGE-->[\s\S]*?<!--\/IF_OG_IMAGE-->/g, '');
  }

  html = html
    .replaceAll('{{TITLE}}', escapeHtml(args.titulo))
    .replaceAll('{{SUBTITLE}}', '')
    .replaceAll('{{MESSAGE}}', escapeHtml(args.intro))
    .replaceAll('{{AUDIO_SRC}}', '')
    .replaceAll('{{THEME}}', tema)
    .replaceAll('{{THEME_COLOR}}', THEME_COLORS[tema] || '#000000')
    .replaceAll('{{OG_DESC}}', escapeHtml(ogDesc))
    .replaceAll('{{OG_IMAGE}}', escapeHtml(ogImage))
    .replaceAll('{{OG_URL}}', escapeHtml(ogUrl))
    .replace('"{{ALBUM_NAME}}"', escapeJs(''))
    .replace('"{{ALBUM_ARTIST}}"', escapeJs('Varios artistas'))
    .replace('"{{COVER_SRC}}"', escapeJs(coverFileName ? './' + coverFileName : ''))
    .replace('"{{SPOTIFY_URL}}"', escapeJs(args.spotify))
    .replace('"{{TIDAL_URL}}"', escapeJs(args.tidal))
    .replace('"{{APPLE_MUSIC_URL}}"', escapeJs(args.apple))
    .replace('"{{YOUTUBE_URL}}"', escapeJs(''))
    .replace('"{{ESCUCHAR_EN}}"', escapeJs('la playlist completa en'))
    .replace('"{{TEMAS_DE}}"', escapeJs('de la playlist'))
    .replace('{{TRACKLIST_JSON}}', JSON.stringify(tracklist));

  fs.writeFileSync(path.join(cardDir, 'index.html'), html, 'utf8');

  console.log(`\n✅ Tarjeta de compilado creada en: cards/${slug}/`);

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
  }
}

main();
