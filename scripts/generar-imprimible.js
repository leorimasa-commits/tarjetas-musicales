#!/usr/bin/env node
/*
 * Genera una página imprimible (tamaño tarjeta, 9x13cm) con la tapa, el título y el QR
 * de una tarjeta ya publicada, para imprimir y armar la tarjeta física.
 *
 * Uso:
 *   node scripts/generar-imprimible.js --slug regalo-thriller40 --titulo "Thriller 40" --tema regalo
 *
 * Requiere que la tarjeta ya tenga su QR generado (correr generar-tarjeta.js o
 * generar-discografia.js con --baseUrl antes de esto).
 *
 * Para imprimir: abrí el archivo imprimible.html generado en el navegador,
 * Ctrl+P → "Guardar como PDF" o imprimir directo.
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

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.slug || !args.titulo) {
    console.error('Uso: node scripts/generar-imprimible.js --slug nombre-carpeta --titulo "Título" [--tema regalo] [--cover ./tapa.jpg]');
    process.exit(1);
  }

  const tema = TEMAS.includes(args.tema) ? args.tema : 'regalo';
  const cardDir = path.resolve(__dirname, '..', 'cards', args.slug);

  const qrPath = path.join(cardDir, 'qr.png');
  if (!fs.existsSync(qrPath)) {
    console.error(`No encontré ${qrPath}. Corré generar-tarjeta.js o generar-discografia.js con --baseUrl primero para generar el QR.`);
    process.exit(1);
  }

  let coverSrc = args.cover || '';
  if (!coverSrc) {
    const candidatos = ['cover.jpg', 'cover.png', 'cover.jpeg'];
    const encontrada = candidatos.find(c => fs.existsSync(path.join(cardDir, c)));
    if (encontrada) coverSrc = './' + encontrada;
  }

  const templatePath = path.resolve(__dirname, '..', 'templates', 'imprimible.template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const escapeHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  html = html
    .replaceAll('{{TITULO}}', escapeHtml(args.titulo))
    .replaceAll('{{THEME}}', tema)
    .replaceAll('{{QR_SRC}}', './qr.png')
    .replaceAll('{{COVER_SRC}}', coverSrc);

  const outPath = path.join(cardDir, 'imprimible.html');
  fs.writeFileSync(outPath, html, 'utf8');

  console.log(`\n✅ Imprimible generado en: cards/${args.slug}/imprimible.html`);
  console.log('   Abrilo en el navegador y Ctrl+P → "Guardar como PDF" para imprimir.');
}

main();
