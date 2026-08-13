#!/usr/bin/env node
/*
 * Combina varias tarjetas ya publicadas (con su QR ya generado) en una sola hoja
 * A4 imprimible, en grilla de tamaño tarjeta de crédito, para imprimir todo junto.
 *
 * Uso:
 *   node scripts/generar-hoja-imprimible.js --items "assets/hoja1/items.txt" --out hoja-imprimible.html
 *
 * El archivo de --items tiene una línea por tarjeta: "slug|Título|tema"
 * (el "tema" es el mismo que usaste al generar esa tarjeta: cumpleanos, fiesta, evento o regalo)
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

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.items) {
    console.error('Uso: node scripts/generar-hoja-imprimible.js --items "archivo.txt" [--out hoja-imprimible.html]');
    process.exit(1);
  }

  const itemsPath = path.resolve(args.items);
  if (!fs.existsSync(itemsPath)) {
    console.error('No encontré el archivo de items: ' + itemsPath);
    process.exit(1);
  }

  const root = path.resolve(__dirname, '..');
  const lineas = fs.readFileSync(itemsPath, 'utf8')
    .split('\n').map(l => l.trim()).filter(Boolean);

  const items = lineas.map(l => {
    const [slug, titulo, tema] = l.split('|').map(p => p.trim());
    const cardDir = path.join(root, 'cards', slug);
    const qrPath = path.join(cardDir, 'qr.png');
    if (!fs.existsSync(qrPath)) {
      console.error(`⚠️  cards/${slug}/qr.png no existe — generá esa tarjeta con --baseUrl primero.`);
      process.exit(1);
    }
    const candidatos = ['cover.jpg', 'cover.png', 'cover.jpeg'];
    let coverFile = candidatos.find(c => fs.existsSync(path.join(cardDir, c)));
    if (!coverFile) {
      // Tarjetas de discografía: el nombre de la tapa de cada álbum es estable
      // (por ID de Spotify, no por posición), así que no se puede adivinar —
      // se toma la del primer álbum tal como quedó en el index.html generado.
      const indexPath = path.join(cardDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, 'utf8');
        const m = html.match(/"cover":"(\.\/covers\/[^"]+)"/);
        if (m) coverFile = m[1].replace(/^\.\//, '');
      }
    }
    return {
      titulo,
      tema: tema || 'regalo',
      qr: `cards/${slug}/qr.png`,
      cover: coverFile ? `cards/${slug}/${coverFile}` : '',
    };
  });

  const slogan = args.slogan || 'Escaneá. Escuchá. Repetí.';

  const templatePath = path.join(root, 'templates', 'hoja-imprimible.template.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html
    .replace('{{ITEMS_JSON}}', JSON.stringify(items))
    .replace('{{SLOGAN_JSON}}', JSON.stringify(slogan));

  const outPath = path.resolve(root, args.out || 'hoja-imprimible.html');
  fs.writeFileSync(outPath, html, 'utf8');

  console.log(`\n✅ Hoja generada en: ${path.relative(root, outPath)}`);
  console.log(`   Con ${items.length} tarjeta(s). Abrila en el navegador y Ctrl+P → "Guardar como PDF" (escala 100%).`);
}

main();
