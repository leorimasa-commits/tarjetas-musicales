# Instalación de la API de pedidos (Cloudflare Workers)

Reemplaza por completo Google Sheets/Drive/Apps Script. Todo esto se hace **una sola
vez**, por línea de comandos (terminal), no hay que entrar a ningún menú de Google.

## 0. Requisitos

- Tener una cuenta de Cloudflare (la misma que ya usás para el dominio scanbeat.com.ar
  sirve — no hace falta crear otra).
- Node.js instalado (ya lo tenés, es lo que usás para correr los `scripts/generar-*.js`).

Todos los comandos de abajo se corren **desde la carpeta `worker/`** de este repo:

```bash
cd worker
```

## 1. Iniciar sesión en Cloudflare (una sola vez)

```bash
npx wrangler login
```

Abre una pestaña del navegador — tocá "Allow" para autorizar. Después podés cerrar esa
pestaña, la terminal queda conectada.

## 2. Crear la base de datos

```bash
npx wrangler d1 create scanbeat-pedidos
```

Este comando imprime algo como:

```
database_id = "1a2b3c4d-....."
```

Copiá ese ID y pegalo en `worker/wrangler.toml`, reemplazando `PEGAR_ACA_EL_DATABASE_ID`.

Después, creá las tablas:

```bash
npx wrangler d1 execute scanbeat-pedidos --remote --file=schema.sql
```

## 3. Crear el almacenamiento de PDFs

```bash
npx wrangler r2 bucket create scanbeat-pedidos-pdfs
```

## 4. Cuenta de Resend (para mandar los mails a clientes)

1. Andá a **resend.com** y creá una cuenta gratis (no es Google, no hace falta tarjeta).
2. En el dashboard, sección **API Keys**, creá una y copiala.
3. Cargala como secreto del Worker (no se guarda en ningún archivo del repo):

```bash
npx wrangler secret put RESEND_API_KEY
```

(te va a pedir que la pegues, Enter, listo).

Por defecto los mails salen desde `onboarding@resend.dev` — funciona de entrada, sin
verificar nada. Si más adelante querés que salgan como `pedidos@scanbeat.com.ar`, hay
que verificar el dominio en Resend (te da unos registros DNS para agregar en Cloudflare,
donde ya administrás el dominio) y después cambiar `FROM_EMAIL` en `wrangler.toml`.

## 5. Desplegar

```bash
npx wrangler deploy
```

Al final imprime la URL real, algo como:

```
https://scanbeat-pedidos.TU-CUENTA.workers.dev
```

Copiá esa URL completa.

## 6. Conectar el sitio con la API

Pegá esa URL en **`assets/api-config.js`** (en la raíz del repo, no en `worker/`),
reemplazando el placeholder:

```js
const API_URL = 'https://scanbeat-pedidos.TU-CUENTA.workers.dev';
```

Guardá, comiteá y pusheá ese archivo — no hace falta regenerar ningún HTML, todas las
páginas (`pedido.html`, `admin/pedidos.html`, `admin/reportes.html`) lo cargan solas.

## Para actualizar el código más adelante

Si en el futuro cambia `worker/src/index.js` (por ejemplo, para arreglar algo o agregar
una función nueva), alcanza con volver a correr, desde `worker/`:

```bash
npx wrangler deploy
```

La URL sigue siendo la misma — no hace falta tocar `assets/api-config.js` de nuevo ni
repetir ningún paso anterior. Mucho más simple que el "Nueva versión → Implementar" de
Apps Script.
