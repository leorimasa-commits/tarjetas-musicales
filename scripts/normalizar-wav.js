#!/usr/bin/env node
/*
 * Reescribe un archivo WAV con un encabezado PCM estándar de 44 bytes
 * (algunos generadores, como el sintetizador de voz de Windows, escriben
 * un bloque "fmt " de 18 bytes en vez de 16, lo cual algunos navegadores
 * no logran decodificar).
 *
 * Uso: node scripts/normalizar-wav.js archivo.wav [salida.wav]
 */
const fs = require('fs');

function normalizarWav(inputPath, outputPath) {
  const buf = fs.readFileSync(inputPath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('No es un archivo WAV válido');
  }

  let offset = 12;
  let fmt = null;
  let data = null;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(chunkStart),
        channels: buf.readUInt16LE(chunkStart + 2),
        sampleRate: buf.readUInt32LE(chunkStart + 4),
        bitsPerSample: buf.readUInt16LE(chunkStart + 14),
      };
    } else if (chunkId === 'data') {
      data = buf.subarray(chunkStart, chunkStart + chunkSize);
    }
    offset = chunkStart + chunkSize + (chunkSize % 2); // los chunks se alinean a 2 bytes
  }

  if (!fmt || !data) throw new Error('No encontré los chunks fmt/data en el WAV');

  const byteRate = fmt.sampleRate * fmt.channels * (fmt.bitsPerSample / 8);
  const blockAlign = fmt.channels * (fmt.bitsPerSample / 8);

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(fmt.channels, 22);
  header.writeUInt32LE(fmt.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(fmt.bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);

  fs.writeFileSync(outputPath, Buffer.concat([header, data]));
}

if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input) {
    console.error('Uso: node scripts/normalizar-wav.js archivo.wav [salida.wav]');
    process.exit(1);
  }
  normalizarWav(input, output || input);
  console.log('OK:', output || input);
}

module.exports = { normalizarWav };
