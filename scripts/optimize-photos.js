/**
 * Keeps the repo lean: re-encodes any committed original that is larger than
 * needed for web display (longest side > 3000px or file > 4MB) down to a
 * high-quality JPEG, preserving EXIF (capture date) and orientation.
 * CI runs this and commits the result back with [skip ci].
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS_DIR = path.join(ROOT, 'photos');
const MAX_DIM = 3000;
const MAX_BYTES = 4 * 1024 * 1024;
const JPEG_QUALITY = 90;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function main() {
  if (!fs.existsSync(PHOTOS_DIR)) return;
  let changed = 0;

  for (const dir of fs.readdirSync(PHOTOS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const catDir = path.join(PHOTOS_DIR, dir.name);
    for (const file of fs.readdirSync(catDir)) {
      const ext = path.extname(file).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;
      const abs = path.join(catDir, file);
      const size = fs.statSync(abs).size;

      let meta;
      try {
        meta = await sharp(abs).metadata();
      } catch {
        console.warn(`  ! Unreadable image, skipping: ${dir.name}/${file}`);
        continue;
      }
      const longest = Math.max(meta.width || 0, meta.height || 0);
      if (longest <= MAX_DIM && size <= MAX_BYTES) continue;

      const outName = file.slice(0, -ext.length) + '.jpg';
      const out = path.join(catDir, outName);
      const buf = await sharp(abs)
        .rotate() // bake in EXIF orientation
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .withMetadata() // keep EXIF (capture date etc.)
        .toBuffer();

      // Only replace if we actually saved space (avoids churn on dense JPEGs)
      if (buf.length >= size && longest <= MAX_DIM) continue;
      if (abs !== out) fs.rmSync(abs);
      fs.writeFileSync(out, buf);
      changed++;
      console.log(
        `  Optimized ${dir.name}/${file}: ${(size / 1e6).toFixed(1)}MB → ${(buf.length / 1e6).toFixed(1)}MB`
      );
    }
  }
  console.log(changed ? `Optimized ${changed} photo(s)` : 'All photos already optimized');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
