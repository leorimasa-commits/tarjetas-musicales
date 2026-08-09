#!/usr/bin/env node
/*
 * Busca los datos de un disco en Spotify (portada + lista de temas con su ID)
 * y los deja listos para usar con generar-tarjeta.js.
 *
 * Uso:
 *   node scripts/buscar-disco.js --spotify "https://open.spotify.com/album/XXXXXXXX" --out mi-disco
 *
 * Esto crea:
 *   assets/mi-disco/cover.jpg
 *   assets/mi-disco/tracklist.txt   (una línea por tema, "Título|idDeSpotify")
 * y te imprime el nombre del disco, el artista, y el comando de generar-tarjeta.js
 * ya armado con esos datos (te faltará completar --titulo, --audio, --tema, y
 * opcionalmente --tidal / --applemusic a mano).
 */
const fs = require('fs');
const path = require('path');

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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.spotify) {
    console.error('Falta --spotify "https://open.spotify.com/album/XXXXXXXX"');
    process.exit(1);
  }

  const idMatch = args.spotify.match(/album\/([a-zA-Z0-9]+)/);
  if (!idMatch) {
    console.error('No pude reconocer el ID del álbum en ese link de Spotify.');
    process.exit(1);
  }
  const albumId = idMatch[1];

  console.log('Buscando datos del álbum en Spotify...');

  const pageRes = await fetch(`https://open.spotify.com/album/${albumId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const pageHtml = await pageRes.text();
  const imageMatch = pageHtml.match(/og:image" content="([^"]*)"/);
  const titleMatch = pageHtml.match(/og:title" content="([^"]*)"/);
  const coverUrl = imageMatch ? imageMatch[1] : null;
  const albumName = titleMatch
    ? titleMatch[1].replace(/\s*\|\s*Spotify$/, '').replace(/\s*-\s*Album by .*/i, '').trim()
    : null;

  const embedRes = await fetch(`https://open.spotify.com/embed/album/${albumId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const embedHtml = await embedRes.text();

  const trackRe = /"uri":"spotify:track:([a-zA-Z0-9]+)","uid":"[^"]*","title":"((?:[^"\\]|\\.)*)","subtitle":"((?:[^"\\]|\\.)*)"/g;
  const tracks = [];
  let m;
  while ((m = trackRe.exec(embedHtml))) {
    const title = JSON.parse('"' + m[2] + '"');
    const artist = JSON.parse('"' + m[3] + '"');
    tracks.push({ id: m[1], title, artist });
  }

  if (!tracks.length) {
    console.error('No encontré temas. Puede que el link no sea de un álbum válido, o que Spotify haya cambiado su formato.');
    process.exit(1);
  }

  const artistName = tracks[0].artist;
  const outSlug = slugify(args.out || albumName || albumId);
  const outDir = path.resolve(__dirname, '..', 'assets', outSlug);
  fs.mkdirSync(outDir, { recursive: true });

  if (coverUrl) {
    const imgRes = await fetch(coverUrl);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(path.join(outDir, 'cover.jpg'), buf);
  }

  const tracklistTxt = tracks.map(t => `${t.title}|${t.id}`).join('\n') + '\n';
  fs.writeFileSync(path.join(outDir, 'tracklist.txt'), tracklistTxt);

  console.log(`\n✅ Disco encontrado: "${albumName}" — ${artistName}`);
  console.log(`   ${tracks.length} temas guardados en assets/${outSlug}/tracklist.txt`);
  console.log(`   Portada guardada en assets/${outSlug}/cover.jpg`);

  console.log('\nAhora corré esto para armar la tarjeta (completá --titulo, --audio, --tema, y --tidal/--applemusic si querés):\n');
  console.log(`node scripts/generar-tarjeta.js \\
  --slug "${outSlug}" \\
  --titulo "${albumName}" \\
  --tema regalo \\
  --audio "TU-AUDIO-AQUI.mp3" \\
  --album "${albumName}" \\
  --artist "${artistName}" \\
  --cover "assets/${outSlug}/cover.jpg" \\
  --spotify "${args.spotify}" \\
  --tracklist "assets/${outSlug}/tracklist.txt"`);
}

main();
