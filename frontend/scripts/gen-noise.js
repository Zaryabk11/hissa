/* global Buffer, __dirname */
// Generates assets/landing/noise.png: a 220px seamless grey noise tile (alpha carries the grain).
// Run: node scripts/gen-noise.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 220;
let seed = 1;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  const row = y * (SIZE * 4 + 1);
  raw[row] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const n = (rnd() + rnd() + rnd()) / 3; // soft grain, like the 2-octave feTurbulence
    const a = Math.max(0, Math.min(1, 1.4 * n - 0.2)); // same alpha matrix as the design
    const i = row + 1 + x * 4;
    raw[i] = raw[i + 1] = raw[i + 2] = 128;
    raw[i + 3] = Math.round(a * 255);
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = path.join(__dirname, '..', 'assets', 'landing', 'noise.png');
fs.writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
