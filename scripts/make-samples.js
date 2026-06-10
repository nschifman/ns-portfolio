/**
 * Generates placeholder sample photos so the site design is visible before
 * real photos are uploaded. Delete the sample categories from /admin (or
 * remove the folders) once real photos are in.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const samples = [
  { cat: 'Sample Landscapes', name: 'sample-dusk', w: 1800, h: 1200, c1: '#1c2a4a', c2: '#9a5b3c' },
  { cat: 'Sample Landscapes', name: 'sample-ridge', w: 1800, h: 1200, c1: '#0e1a26', c2: '#3e6273' },
  { cat: 'Sample Landscapes', name: 'sample-valley', w: 1200, h: 1800, c1: '#16261c', c2: '#7a8c52' },
  { cat: 'Sample Landscapes', name: 'sample-coast', w: 1800, h: 1000, c1: '#101c2e', c2: '#5e7d9a' },
  { cat: 'Sample Street', name: 'sample-neon', w: 1200, h: 1800, c1: '#1a0f24', c2: '#b3455e' },
  { cat: 'Sample Street', name: 'sample-crossing', w: 1800, h: 1200, c1: '#141414', c2: '#6b6f78' },
  { cat: 'Sample Street', name: 'sample-rain', w: 1800, h: 1200, c1: '#0d1420', c2: '#46586e' },
  { cat: 'Sample Street', name: 'sample-late', w: 1200, h: 1800, c1: '#1f1408', c2: '#b08440' },
];

for (const s of samples) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stop-color="${s.c1}"/>
        <stop offset="1" stop-color="${s.c2}"/>
      </linearGradient>
      <radialGradient id="v" cx="0.5" cy="0.5" r="0.8">
        <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.45"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" fill="url(#v)"/>
    <text x="50%" y="52%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
      font-size="${Math.round(s.w / 28)}" letter-spacing="${Math.round(s.w / 90)}"
      fill="#ffffff" fill-opacity="0.55">SAMPLE</text>
  </svg>`;

  const dir = path.join(ROOT, 'photos', s.cat);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${s.name}.jpg`);
  await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toFile(out);
  console.log(`  ${s.cat}/${s.name}.jpg (${s.w}x${s.h})`);
}
console.log('Sample photos generated.');
