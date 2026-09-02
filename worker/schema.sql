-- Esquema de la base de datos D1 de ScanBeat (reemplaza la planilla de Google Sheets).
-- Correr una sola vez, después de crear la base:
--   npx wrangler d1 execute scanbeat-pedidos --remote --file=schema.sql
-- (sacar --remote para aplicarlo solo a la base local de `wrangler dev`).

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  nombre TEXT,
  contacto TEXT,
  discografias TEXT,
  comentario TEXT,
  pdf_key TEXT,           -- nombre del archivo en el bucket R2, no la URL completa
  pagado INTEGER NOT NULL DEFAULT 0,
  entrega TEXT DEFAULT 'Física',
  slugs TEXT
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);
