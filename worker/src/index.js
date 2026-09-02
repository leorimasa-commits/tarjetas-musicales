/**
 * ScanBeat — API de pedidos, corre en Cloudflare Workers. Reemplaza por completo el
 * Google Apps Script + Sheets viejo (ver google-apps-script/pedidos-webapp.gs, que
 * queda solo como referencia histórica, ya no se usa).
 *
 * - Base de datos: Cloudflare D1 (binding `DB`) — reemplaza la planilla de Sheets.
 * - Archivos (PDF de cada pedido): Cloudflare R2 (binding `PDFS`) — reemplaza la
 *   carpeta de Drive. Se sirven de vuelta a través de este mismo Worker (GET /pdf/:key),
 *   no hace falta hacer público el bucket.
 * - Mail al cliente: Resend (https://resend.com, cuenta gratis) — reemplaza MailApp de
 *   Google. La API key va como secreto (`RESEND_API_KEY`, ver wrangler.toml), nunca en
 *   este archivo.
 *
 * Ver INSTALACION.md en esta misma carpeta para los pasos de deploy (una sola vez).
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function listPedidos(env, url) {
  const { results } = await env.DB.prepare(
    `SELECT id, fecha, nombre, contacto, discografias, comentario, pdf_key, pagado, entrega, slugs
     FROM pedidos ORDER BY id DESC`
  ).all();
  const data = results.map((r) => ({
    // Se llama "row" (no "id") a propósito: es el mismo nombre que ya usaba
    // admin/reportes.html para el número de fila de Sheets, así el HTML/JS del panel
    // no necesitó cambios más allá de la URL de la API.
    row: r.id,
    fecha: r.fecha,
    nombre: r.nombre,
    contacto: r.contacto,
    discografias: r.discografias,
    comentario: r.comentario,
    pdf: r.pdf_key ? `${url.origin}/pdf/${encodeURIComponent(r.pdf_key)}` : '',
    pagado: !!r.pagado,
    entrega: r.entrega,
    slugs: r.slugs,
  }));
  return json(data);
}

async function crearPedido(request, env) {
  const data = await request.json();
  let pdfKey = '';
  if (data.pdfBase64) {
    const bytes = base64ToUint8Array(data.pdfBase64);
    const nombreSeguro = (data.nombre || 'sin-nombre').replace(/[^a-zA-Z0-9]/g, '-');
    pdfKey = `pedido-${nombreSeguro}-${Date.now()}.pdf`;
    await env.PDFS.put(pdfKey, bytes, { httpMetadata: { contentType: 'application/pdf' } });
  }
  await env.DB.prepare(
    `INSERT INTO pedidos (fecha, nombre, contacto, discografias, comentario, pdf_key, pagado, entrega, slugs)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
  )
    .bind(
      new Date().toISOString(),
      data.nombre || '',
      data.contacto || '',
      data.discografias || '',
      data.comentario || '',
      pdfKey,
      data.entrega || 'Física',
      data.slugs || ''
    )
    .run();
  return json({ ok: true });
}

async function marcarPagado(request, env, id) {
  const data = await request.json();
  await env.DB.prepare('UPDATE pedidos SET pagado = ? WHERE id = ?').bind(data.pagado ? 1 : 0, id).run();
  return json({ ok: true });
}

async function eliminarPedido(env, id) {
  const row = await env.DB.prepare('SELECT pdf_key FROM pedidos WHERE id = ?').bind(id).first();
  if (row && row.pdf_key) {
    await env.PDFS.delete(row.pdf_key).catch(() => {});
  }
  await env.DB.prepare('DELETE FROM pedidos WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

async function servirPdf(env, key) {
  const obj = await env.PDFS.get(key);
  if (!obj) return json({ error: 'No encontrado' }, 404);
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${key}"`,
      ...CORS_HEADERS,
    },
  });
}

async function enviarMail(request, env, id) {
  const data = await request.json();
  const row = await env.DB.prepare('SELECT contacto FROM pedidos WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: 'Pedido no encontrado' }, 404);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'Falta configurar RESEND_API_KEY (wrangler secret put)' }, 500);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'ScanBeat <onboarding@resend.dev>',
      to: [row.contacto],
      subject: data.asunto || 'Tu pedido de ScanBeat',
      text: data.mensaje || '',
    }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) return json({ ok: false, error: result.message || 'Error enviando el mail' }, 500);
  return json({ ok: true });
}

async function leerConfig(env) {
  const { results } = await env.DB.prepare('SELECT key, value FROM config').all();
  const map = {};
  for (const r of results) map[r.key] = r.value;
  return json({
    precioPorHoja: Number(map.precioPorHoja || 0),
    precioDigital: Number(map.precioDigital || 0),
  });
}

async function guardarConfig(request, env) {
  const data = await request.json();
  const upsert = `INSERT INTO config (key, value) VALUES (?, ?)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
  await env.DB.prepare(upsert).bind('precioPorHoja', String(data.precioPorHoja || 0)).run();
  await env.DB.prepare(upsert).bind('precioDigital', String(data.precioDigital || 0)).run();
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const { method } = request;

    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if (pathname === '/pedidos' && method === 'GET') return await listPedidos(env, url);
      if (pathname === '/pedidos' && method === 'POST') return await crearPedido(request, env);

      const idMatch = pathname.match(/^\/pedidos\/(\d+)$/);
      if (idMatch && method === 'PATCH') return await marcarPagado(request, env, Number(idMatch[1]));
      if (idMatch && method === 'DELETE') return await eliminarPedido(env, Number(idMatch[1]));

      const mailMatch = pathname.match(/^\/pedidos\/(\d+)\/enviar-mail$/);
      if (mailMatch && method === 'POST') return await enviarMail(request, env, Number(mailMatch[1]));

      const pdfMatch = pathname.match(/^\/pdf\/(.+)$/);
      if (pdfMatch && method === 'GET') return await servirPdf(env, decodeURIComponent(pdfMatch[1]));

      if (pathname === '/config' && method === 'GET') return await leerConfig(env);
      if (pathname === '/config' && method === 'POST') return await guardarConfig(request, env);

      return json({ error: 'Ruta no encontrada' }, 404);
    } catch (err) {
      return json({ ok: false, error: String((err && err.message) || err) }, 500);
    }
  },
};
