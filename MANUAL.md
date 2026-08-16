# Manual: cómo hacer una tarjeta nueva (motor de ScanBeat)

Guía paso a paso para armar una tarjeta musical (QR/NFC que suena solo al escanear) sin
necesitar ayuda. Todo se corre desde la carpeta `tarjetas-musicales` con la terminal.

> Nota de marca: **ScanBeat** es el nombre comercial del producto (antes "OneTapMusic") —
> así se lo presentás al cliente (packaging, redes, etc.). El nombre técnico de esta
> carpeta/repo no cambia.

## ¿Disco suelto o discografía completa? Dos herramientas distintas

Hay dos tipos de tarjeta, y cada una tiene su propio script — nunca se mezclan:

| Querés regalar... | Usás... | Resultado |
|---|---|---|
| **Un disco puntual** (ej. un álbum para un cumpleaños) | `buscar-disco.js` + `generar-tarjeta.js` | Una página con ese disco: tapa grande, mensaje/audio propio, botones a plataformas, lista de temas. |
| **Toda la carrera de un artista** (varios discos) | `generar-discografia.js` | Una página con todos los discos en lista, cada uno con su tapa chica, año, link a Spotify y su propia lista de temas desplegable. |

Regla simple: si es **un solo disco**, siempre `generar-tarjeta.js`. Si son **varios discos
del mismo artista**, siempre `generar-discografia.js`. No hace falta decidir nada más — el
nombre del comando ya te dice cuál corresponde.

Para no confundir las carpetas de salida, es buena costumbre que el `--slug` de una
discografía termine en `-discografia` (ej. `redondos-discografia`), tal como se hizo hasta
ahora.

## Resumen del flujo (disco suelto)

1. Conseguís el link de Spotify del disco.
2. Corrés `buscar-disco.js` con ese link → te descarga la portada y la lista de temas solo.
3. (Opcional) buscás a mano los links de Tidal y Apple Music del mismo disco.
4. Corrés `generar-tarjeta.js` con todo eso + tu propio audio (el que suena automático).
5. Probás la tarjeta en tu compu con `dev-server.js`.
6. Publicás el sitio (Netlify Drop o GitHub Pages) para tener la URL final.
7. Generás el QR y grabás un tag NFC con esa URL.

---

## Audio automático: alternativa con voz (sin grabarte)

Si no querés grabarte, podés usar el sintetizador de voz de Windows para generar una
narración/reseña corta y original (nunca uses la voz para "cantar" o leer letras de
canciones — es para un texto propio tipo presentación/reseña del disco).

```powershell
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Helena Desktop")   # voz en español instalada en Windows
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$synth.SetOutputToWaveFile("mi-resena.wav", $format)
$synth.Speak("Acá va el texto de tu reseña.")
$synth.Dispose()
```

Después normalizá el archivo (el WAV que genera Windows tiene un encabezado no estándar
que algunos navegadores no logran reproducir):

```bash
node scripts/normalizar-wav.js mi-resena.wav
```

Y usalo como cualquier otro audio con `--audio mi-resena.wav`.

## Paso 1 — Conseguir el link de Spotify del disco

Entrá a [open.spotify.com](https://open.spotify.com), buscá el disco, abrilo, y copiá la URL
de la barra de direcciones. Tiene que verse así:

```
https://open.spotify.com/album/XXXXXXXXXXXXXXXXXXXXXX
```

## Paso 2 — Buscar los datos del disco automáticamente

```bash
node scripts/buscar-disco.js --spotify "PEGÁ_ACÁ_EL_LINK_DE_SPOTIFY" --out nombre-carpeta
```

`--out` es solo el nombre de una carpeta (sin espacios ni tildes) para guardar los archivos,
por ejemplo `--out abbey-road`. Esto te crea:

- `assets/nombre-carpeta/cover.jpg` — la portada oficial.
- `assets/nombre-carpeta/tracklist.txt` — los temas del disco, cada uno con su ID de Spotify
  (para que se puedan escuchar individualmente en la tarjeta).

Al final te imprime en la terminal el comando de `generar-tarjeta.js` ya armado con esos datos
— solo tenés que completar `--titulo`, `--audio`, `--tema`, y copiarlo.

> Esto solo funciona con **Spotify** (es la única plataforma de la que se puede sacar la info
> automáticamente sin necesitar una cuenta de desarrollador). Tidal y Apple Music hay que
> buscarlos a mano (paso 3).

## Paso 3 — (Opcional) Links de Tidal y Apple Music

Si querés que la tarjeta tenga también un botón para Tidal y/o Apple Music, buscá el mismo
disco en esas plataformas y copiá la URL. Es opcional — si no los tenés, la tarjeta muestra
solo el botón de Spotify.

## Paso 4 — Generar la tarjeta

Usá el comando que te imprimió `buscar-disco.js`, completando lo que falta:

```bash
node scripts/generar-tarjeta.js \
  --slug "nombre-carpeta" \
  --titulo "Título que se ve grande en la tarjeta" \
  --tema regalo \
  --audio "C:\ruta\a\tu-mensaje-o-grabacion.mp3" \
  --album "Nombre del disco" \
  --artist "Artista" \
  --cover "assets/nombre-carpeta/cover.jpg" \
  --spotify "https://open.spotify.com/album/XXXXXXXX" \
  --tidal "https://tidal.com/album/XXXXXXXX" \
  --applemusic "https://music.apple.com/..." \
  --tracklist "assets/nombre-carpeta/tracklist.txt"
```

Notas sobre cada parte:

- **`--audio`**: el audio que arranca solo apenas se abre la tarjeta. Tiene que ser algo
  propio (una grabación tuya, un mensaje, una canción propia) — nunca un archivo de una
  canción comercial de otro artista, por temas de derechos de autor. Si todavía no lo
  tenés, podés poner cualquier archivo de audio de prueba y reemplazarlo después
  volviendo a correr el mismo comando.
- **`--tema`**: define los colores. Opciones: `cumpleanos`, `fiesta`, `evento`, `regalo`.
- **`--tidal` / `--applemusic`**: opcionales, se pueden omitir.
- Todo lo relacionado al disco (`--album`, `--artist`, `--cover`, `--spotify`, `--tidal`,
  `--applemusic`, `--tracklist`) es opcional en conjunto — si no pasás nada de esto, la
  tarjeta queda simple (solo título, mensaje y audio, sin la sección del disco).

Esto crea la carpeta `cards/nombre-carpeta/` con la tarjeta lista.

## Paso 5 — Probar en tu compu antes de publicar

Editá `scripts/dev-server.js` y cambiá esta línea para que apunte a tu tarjeta nueva:

```js
const root = path.resolve(__dirname, '..', 'cards', 'nombre-carpeta');
```

Después corré:

```bash
node scripts/dev-server.js
```

Y abrí `http://localhost:5173` en tu navegador.

## Paso 6 — Publicar el sitio

Recién en este paso conseguís la URL final y podés generar el QR de verdad. Dos opciones:

**Netlify Drop** (sin cuenta, instantáneo): entrá a
[app.netlify.com/drop](https://app.netlify.com/drop) y arrastrá toda la carpeta
`tarjetas-musicales`. Te da una URL tipo `https://algo-random.netlify.app`.

**GitHub Pages** (necesita cuenta de GitHub): subís el proyecto a un repositorio y activás
Pages en la configuración del repo. Te da una URL tipo
`https://tu-usuario.github.io/tarjetas-musicales`.

## Paso 7 — Generar el QR y grabar el NFC

Una vez que tenés la URL publicada, volvé a correr `generar-tarjeta.js` agregando
`--baseUrl` con esa URL:

```bash
node scripts/generar-tarjeta.js \
  ...(los mismos parámetros que usaste antes)... \
  --baseUrl "https://tu-url-publicada.com"
```

Esto genera `cards/nombre-carpeta/qr.png` y te muestra en la terminal la URL final exacta.
Grabá esa misma URL en un tag NFC con una app como **NFC Tools** (Android/iPhone), eligiendo
un registro de tipo "URL/URI".

> En este repo `--baseUrl` tiene como default `https://scanbeat.com.ar` (el dominio ya
> publicado), así que en la práctica no hace falta pasarlo salvo que quieras probar contra
> otro sitio.

---

## Flujo para discografía completa (varios discos de un artista)

A diferencia del disco suelto, acá no usás `buscar-disco.js` ni `generar-tarjeta.js` —
todo lo hace `generar-discografia.js` en un solo paso.

### Paso 1 — Armar la lista de discos

Creá un archivo de texto (por ejemplo `assets/mi-artista/albums.txt`) con una línea por
disco, en el formato `Título|Año|LinkDeSpotify`:

```
Nombre del primer disco|1984|https://open.spotify.com/album/XXXXXXXX
Nombre del segundo disco|1986|https://open.spotify.com/album/YYYYYYYY
```

Conseguís cada link de Spotify igual que en el Paso 1 del disco suelto (buscás el álbum en
open.spotify.com y copiás la URL).

### Paso 2 — Generar la tarjeta

```bash
node scripts/generar-discografia.js \
  --slug mi-artista-discografia \
  --artista "Nombre del Artista" \
  --tema regalo \
  --albumes "assets/mi-artista/albums.txt" \
  --youtube "https://youtube.com/@canaloficial" \
  --baseUrl "https://tu-sitio-publicado.com"
```

El script busca automáticamente la tapa y la lista de temas (con sus IDs de Spotify) de
**cada disco** del archivo — no hace falta buscarlas a mano. `--youtube` es opcional y
**solo** tiene sentido si encontraste un canal oficial verificado del artista (nunca un
canal de fans) — se muestra como un único link arriba de todo, no por disco.

### Paso 3 — Probar y publicar

Igual que con el disco suelto: editá `scripts/dev-server.js` para que apunte a
`cards/mi-artista-discografia`, probá en `localhost:5173`, y una vez publicado el sitio
volvé a correr el mismo comando con `--baseUrl` para tener el QR final.

---

## Resumen ultra-corto

**Disco suelto:**
```bash
node scripts/buscar-disco.js --spotify "LINK" --out carpeta
node scripts/generar-tarjeta.js --slug carpeta --titulo "..." --tema regalo --audio "tu-audio.mp3" --album "..." --artist "..." --cover assets/carpeta/cover.jpg --spotify "LINK" --tracklist assets/carpeta/tracklist.txt --baseUrl "https://tu-sitio-publicado.com"
```

**Discografía completa:**
```bash
node scripts/generar-discografia.js --slug artista-discografia --artista "Nombre" --tema regalo --albumes "assets/artista/albums.txt" --baseUrl "https://tu-sitio-publicado.com"
```
