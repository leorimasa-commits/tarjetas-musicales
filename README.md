# Tarjetas musicales NFC/QR

Sistema para generar tarjetas (cumpleaños, fiestas, presentación de eventos, regalos musicales)
que al escanear el QR o acercar el celular a un tag NFC, abren una página que arranca la música
automáticamente.

**Para armar una tarjeta nueva paso a paso, seguí [MANUAL.md](./MANUAL.md).** Este README es
la referencia rápida de cada script.

## Cómo funciona

1. (Opcional) Corrés `scripts/buscar-disco.js` con el link de Spotify del disco para traer
   automáticamente la portada y la lista de temas.
2. Generás una tarjeta con el script `scripts/generar-tarjeta.js`, indicando el título, mensaje,
   tema visual y el archivo de audio (más los datos del disco si los tenés).
3. Eso crea una carpeta en `cards/<slug>/` con una página HTML5 autocontenida + el audio.
4. Publicás el sitio (gratis) en GitHub Pages o Netlify.
5. El script te da la URL final y te genera el QR (`qr.png`).
6. Escribís esa misma URL en un tag NFC con una app como **NFC Tools** (Android/iPhone) — se graba
   como un registro "URL/URI".
7. Al escanear el QR o acercar el celular al NFC, se abre la página y la música arranca sola
   (si el navegador bloquea el autoplay, aparece un botón grande "Toca para escuchar").

## Buscar los datos de un disco automáticamente

```bash
node scripts/buscar-disco.js --spotify "https://open.spotify.com/album/XXXXXXXX" --out nombre-carpeta
```

Descarga la portada oficial y la lista de temas (con su ID de Spotify, para que cada tema se
pueda escuchar individualmente en la tarjeta) en `assets/nombre-carpeta/`, y te imprime el
comando de `generar-tarjeta.js` ya armado con esos datos.

## Generar una tarjeta

```bash
node scripts/generar-tarjeta.js \
  --slug juan-30 \
  --titulo "¡Feliz cumple, Juan!" \
  --subtitulo "Feliz cumpleaños" \
  --mensaje "Que este año esté lleno de música y buenos momentos." \
  --tema cumpleanos \
  --audio "C:\ruta\a\cancion.mp3" \
  --baseUrl "https://tu-usuario.github.io/tarjetas-musicales"
```

Temas disponibles: `cumpleanos`, `fiesta`, `evento`, `regalo`.

Si todavía no publicaste el sitio, podés omitir `--baseUrl`: se genera la tarjeta igual, y
después corrés el mismo comando de nuevo (ya con `--baseUrl`) para que te arme el QR con la URL
correcta.

## Probar localmente antes de publicar

Generá una tarjeta con `--slug prueba` (o el nombre que quieras) y después:

```bash
node scripts/dev-server.js
```

Abrí `http://localhost:5173` en el navegador para ver cómo queda antes de subirla.
(El script sirve la carpeta `cards/prueba`; si usaste otro slug, editá `root` en
`scripts/dev-server.js`.)

## Publicar gratis (GitHub Pages)

1. Creá un repositorio en GitHub (por ejemplo `tarjetas-musicales`) y subí esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "Tarjetas musicales"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/tarjetas-musicales.git
   git push -u origin main
   ```
2. En GitHub: **Settings → Pages → Source: rama `main`, carpeta `/ (root)`**.
3. GitHub te da la URL pública, algo como `https://tu-usuario.github.io/tarjetas-musicales/`.
   Esa es la `--baseUrl` que usás al generar cada tarjeta.

### Alternativa: Netlify
Arrastrás la carpeta del proyecto a [app.netlify.com/drop](https://app.netlify.com/drop) y te da
una URL al instante. Sirve igual de bien para este uso.

## Grabar el tag NFC

1. Instalá una app gratuita de escritura NFC (ej. **NFC Tools** en Android o iPhone).
2. Elegí "Escribir" → agregar registro tipo **URL/URI**.
3. Pegá la URL exacta de la tarjeta (la misma que el QR).
4. Acercá el tag NFC (una calcomanía o tarjeta con chip NFC) y grabá.
5. Probá acercando el celular al tag: debería abrir la página directamente.

> Los tags NFC tipo NTAG213/215/216 son baratos y se consiguen como stickers o tarjetas plásticas;
> tienen memoria de sobra para guardar solo una URL.

## Tarjeta de discografía completa (varios discos de un artista)

Distinto caso de uso, script separado — `scripts/generar-discografia.js`. Se usa cuando
querés regalar toda la carrera de un artista (no un disco puntual):

```bash
node scripts/generar-discografia.js \
  --slug artista-discografia \
  --artista "Nombre del Artista" \
  --tema regalo \
  --albumes "assets/artista/albums.txt" \
  --youtube "https://youtube.com/@canaloficial" \
  --baseUrl "https://tu-usuario.github.io/tarjetas-musicales"
```

El archivo de `--albumes` tiene una línea por disco: `Título|Año|LinkDeSpotify`. El script
busca automáticamente la tapa y la lista de temas de cada uno. `--youtube` es opcional y
solo debe usarse con un canal oficial verificado (nunca de fans). Ver el manual para el
detalle paso a paso.

## Notas sobre el audio

- Usá archivos propios (grabaciones tuyas, música libre de derechos, o canciones que tengas
  licencia para compartir de esa forma). Si vas a regalar canciones comerciales de terceros,
  tené en cuenta que subir el archivo de audio a un sitio público puede infringir derechos de
  autor — para eso conviene evaluar un link oficial (Spotify/YouTube) en vez de alojar el MP3.
- Archivos MP3 livianos (buena calidad a 128–192kbps) cargan más rápido en el celular del
  destinatario, sobre todo si escanea con datos móviles.
