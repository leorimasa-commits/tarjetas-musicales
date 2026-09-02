// URL de la API de pedidos (Cloudflare Worker) — ÚNICO lugar donde se define. Todas
// las páginas que la necesitan (pedido.html, admin/pedidos.html, admin/reportes.html)
// cargan este archivo antes de su propio script, así que alcanza con cambiar acá si
// el Worker se vuelve a desplegar con otro nombre/dominio.
//
// Se completa después de correr `npx wrangler deploy` en la carpeta worker/ — el
// comando imprime la URL real (algo como https://scanbeat-pedidos.TU-CUENTA.workers.dev).
const API_URL = 'https://scanbeat-pedidos.leorimasa.workers.dev';
