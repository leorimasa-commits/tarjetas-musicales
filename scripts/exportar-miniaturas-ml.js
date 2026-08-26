#!/usr/bin/env node
/*
 * Copia la tapa "principal" de cada discografía/compilado (la misma que ya se usa
 * como miniatura en catalogo.html, pedido.html y admin/pedidos.html) a una carpeta
 * separada con nombres prolijos, lista para subir como foto de cada variante en
 * Mercado Libre.
 *
 * Uso: node scripts/exportar-miniaturas-ml.js
 * Salida: ml-assets/miniaturas-variantes/<nn>-<slug>.jpg
 *
 * Correr de nuevo cada vez que se agregue una discografía/compilado nuevo, antes de
 * actualizar las publicaciones de ML.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'pedido.html'), 'utf8');
const m = html.match(/const CARDS = (\[.*?\]);/s);
const cards = JSON.parse(m[1]);

const outDir = path.join(root, 'ml-assets', 'miniaturas-variantes');
fs.mkdirSync(outDir, { recursive: true });

cards.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }));

let copiadas = 0;
let sinTapa = [];
cards.forEach((c, i) => {
  if (!c.cover) { sinTapa.push(c.titulo); return; }
  const srcPath = path.join(root, c.cover);
  if (!fs.existsSync(srcPath)) { sinTapa.push(c.titulo); return; }
  const ext = path.extname(srcPath) || '.jpg';
  const num = String(i + 1).padStart(2, '0');
  const destName = `${num}-${c.slug}${ext}`;
  fs.copyFileSync(srcPath, path.join(outDir, destName));
  copiadas++;
});

console.log(`✅ ${copiadas} miniaturas copiadas a ml-assets/miniaturas-variantes/`);
if (sinTapa.length) {
  console.log(`⚠️  Sin tapa (revisar): ${sinTapa.join(', ')}`);
}
