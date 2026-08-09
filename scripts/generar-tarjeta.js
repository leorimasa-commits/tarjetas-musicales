#!/usr/bin/env node
/*
 * Genera una tarjeta musical (carpeta lista para publicar) a partir de la plantilla.
 * Uso:
 *   node scripts/generar-tarjeta.js \
 *     --slug juan-30 \
 *     --titulo "¡Feliz cumple, Juan!" \
 *     --subtitulo "Feliz cumpleaños" \
 *     --mensaje "Que este año esté lleno de..." \
 *     --tema cumpleanos \
 *     --audio "C:\ruta\a\cancion.mp3" \
 *     --baseUrl "https://usuario.github.io/tarjetas-musicales"
 *
 * --audio es opcional: si no lo pasás, la tarjeta abre directo mostrando la tapa y los
 * botones (si hay datos de disco), sin overlay de "tocar para escuchar" ni controles de audio.
 *
 * Temas disponibles: cumpleanos | fiesta | evento | regalo
 *
 * Opcional, para mostrar un disco (portada + botones a plataformas + lista de temas):
 *   --album "Nombre del disco" --artist "Artista" --cover "./tapa.jpg" \
 *   --spotify "https://open.spotify.com/album/..." \
 *   --tidal "https://tidal.com/album/..." \
 *   --applemusic "https://music.apple.com/..." \
 *   --tracklist "./lista-temas.txt" (un tema por línea; opcionalmente "Título|idDeSpotify"
 *     para que ese tema se pueda tocar individualmente con el preview oficial de Spotify)
 */
const fs = require('fs');
const path = require('path');

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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.titulo) {
    console.error('Falta --titulo. Ejemplo:\n  node scripts/generar-tarjeta.js --titulo "Feliz cumple" --audio cancion.mp3 --tema cumpleanos');
    process.exit(1);
  }

  const tema = TEMAS.includes(args.tema) ? args.tema : 'regalo';
  const slug = slugify(args.slug || args.titulo);
  const subtitulo = args.subtitulo || '';
  const mensaje = args.mensaje || '';
  const baseUrl = (args.baseUrl || '').replace(/\/$/, '');

  const cardDir = path.resolve(__dirname, '..', 'cards', slug);
  fs.mkdirSync(cardDir, { recursive: true });

  let audioFileName = '';
  if (args.audio) {
    const audioSrcPath = path.resolve(args.audio);
    if (!fs.existsSync(audioSrcPath)) {
      console.error(`No se encontró el archivo de audio: ${audioSrcPath}`);
      process.exit(1);
    }
    audioFileName = 'song' + (path.extname(audioSrcPath) || '.mp3');
    fs.copyFileSync(audioSrcPath, path.join(cardDir, audioFileName));
  }

  // --- Datos opcionales del disco (portada, links a plataformas, lista de temas) ---
  let coverFileName = '';
  if (args.cover) {
    const coverSrcPath = path.resolve(args.cover);
    if (!fs.existsSync(coverSrcPath)) {
      console.error(`No se encontró la imagen de portada: ${coverSrcPath}`);
      process.exit(1);
    }
    coverFileName = 'cover' + (path.extname(coverSrcPath) || '.jpg');
    fs.copyFileSync(coverSrcPath, path.join(cardDir, coverFileName));
  }

  let tracklist = [];
  if (args.tracklist) {
    const tracklistPath = path.resolve(args.tracklist);
    if (!fs.existsSync(tracklistPath)) {
      console.error(`No se encontró el archivo de lista de temas: ${tracklistPath}`);
      process.exit(1);
    }
    tracklist = fs.readFileSync(tracklistPath, 'utf8')
      .split('\n').map(l => l.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean)
      .map(l => {
        const [title, spotifyId] = l.split('|').map(p => p.trim());
        return spotifyId ? { title, spotifyId } : { title };
      });
  }

  const templatePath = path.resolve(__dirname, '..', 'templates', 'card.template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const escapeJs = (s) => JSON.stringify(String(s || ''));

  if (audioFileName) {
    html = html.replaceAll('<!--IF_AUDIO-->', '').replaceAll('<!--/IF_AUDIO-->', '');
  } else {
    html = html.replace(/<!--IF_AUDIO-->[\s\S]*?<!--\/IF_AUDIO-->/g, '');
  }

  html = html
    .replaceAll('{{TITLE}}', escapeHtml(args.titulo))
    .replaceAll('{{SUBTITLE}}', escapeHtml(subtitulo))
    .replaceAll('{{MESSAGE}}', escapeHtml(mensaje))
    .replaceAll('{{AUDIO_SRC}}', './' + audioFileName)
    .replaceAll('{{THEME}}', tema)
    .replace('"{{ALBUM_NAME}}"', escapeJs(args.album))
    .replace('"{{ALBUM_ARTIST}}"', escapeJs(args.artist))
    .replace('"{{COVER_SRC}}"', escapeJs(coverFileName ? './' + coverFileName : ''))
    .replace('"{{SPOTIFY_URL}}"', escapeJs(args.spotify))
    .replace('"{{TIDAL_URL}}"', escapeJs(args.tidal))
    .replace('"{{APPLE_MUSIC_URL}}"', escapeJs(args.applemusic))
    .replace('{{TRACKLIST_JSON}}', JSON.stringify(tracklist));

  fs.writeFileSync(path.join(cardDir, 'index.html'), html, 'utf8');

  console.log(`\n✅ Tarjeta creada en: cards/${slug}/`);

  if (baseUrl) {
    const finalUrl = `${baseUrl}/cards/${slug}/`;
    try {
      const QRCode = require('qrcode');
      const qrPath = path.join(cardDir, 'qr.png');
      await QRCode.toFile(qrPath, finalUrl, { width: 600, margin: 2 });
      console.log(`🔗 URL final:     ${finalUrl}`);
      console.log(`📷 QR generado:   cards/${slug}/qr.png`);
      console.log(`📡 Grabá el mismo texto (${finalUrl}) en el tag NFC con una app como "NFC Tools".`);
    } catch (e) {
      console.log(`🔗 URL final:     ${finalUrl}`);
      console.log('(No se pudo generar el QR automáticamente: ' + e.message + ')');
    }
  } else {
    console.log('ℹ️  No pasaste --baseUrl, así que no generé el QR todavía.');
    console.log('   Una vez que publiques el sitio, corré de nuevo con --baseUrl para generar el QR y la URL para el NFC.');
  }
}

main();
