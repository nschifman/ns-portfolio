/**
 * Static site generator.
 *
 * Scans photos/<Category>/* , generates responsive WebP variants (cached in
 * .cache/ by content hash so unchanged photos are never re-encoded), and
 * renders the entire site as static HTML into dist/.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';
import sharp from 'sharp';
import * as t from './templates.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS_DIR = path.join(ROOT, 'photos');
const CACHE_DIR = path.join(ROOT, '.cache');
const DIST = path.join(ROOT, 'dist');
const SITE_ASSETS = path.join(ROOT, 'site');
const ADMIN_DIR = path.join(ROOT, 'admin');

const VARIANT_WIDTHS = [480, 960, 1600, 2560];
const WEBP_QUALITY = 82;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';

function hashFile(buf) {
  return createHash('sha1').update(buf).digest('hex').slice(0, 12);
}

/** Generate (or reuse cached) variants + metadata for one photo. */
async function processPhoto(absPath, relPath) {
  const buf = fs.readFileSync(absPath);
  const hash = hashFile(buf);
  const cacheDir = path.join(CACHE_DIR, hash);
  const metaPath = path.join(cacheDir, 'meta.json');

  let meta = null;
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      // Sanity check: all variant files must exist in cache
      if (!meta.variants.every((v) => fs.existsSync(path.join(cacheDir, v.file)))) meta = null;
    } catch {
      meta = null;
    }
  }

  if (!meta) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const img = sharp(buf).rotate(); // auto-orient from EXIF
    const { width, height } = await img.metadata().then((m) => {
      // .rotate() swaps dimensions for portrait EXIF orientations 5-8
      const swap = m.orientation >= 5;
      return { width: swap ? m.height : m.width, height: swap ? m.width : m.height };
    });

    let date = null;
    try {
      const exif = await exifr.parse(buf, ['DateTimeOriginal', 'CreateDate']);
      date = exif?.DateTimeOriginal || exif?.CreateDate || null;
      if (date) date = new Date(date).toISOString();
    } catch {
      /* no EXIF — fall back to filename sort */
    }

    const widths = VARIANT_WIDTHS.filter((w) => w < width);
    widths.push(Math.min(width, VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]));

    const variants = [];
    for (const w of [...new Set(widths)].sort((a, b) => a - b)) {
      const file = `${hash}-${w}.webp`;
      await sharp(buf)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(path.join(cacheDir, file));
      variants.push({ w, h: Math.round((height / width) * w), file });
    }

    const blurBuf = await sharp(buf)
      .rotate()
      .resize({ width: 24 })
      .webp({ quality: 40 })
      .toBuffer();
    const blur = `data:image/webp;base64,${blurBuf.toString('base64')}`;

    meta = { width, height, date, blur, variants };
    fs.writeFileSync(metaPath, JSON.stringify(meta));
  }

  // Copy cached variants into dist
  for (const v of meta.variants) {
    fs.copyFileSync(path.join(cacheDir, v.file), path.join(DIST, 'img', v.file));
  }

  const largest = meta.variants[meta.variants.length - 1];
  return {
    rel: relPath,
    file: path.basename(relPath),
    hash,
    width: meta.width,
    height: meta.height,
    date: meta.date,
    blur: meta.blur,
    variants: meta.variants,
    srcset: meta.variants.map((v) => `/img/${v.file} ${v.w}w`).join(', '),
    thumb: `/img/${meta.variants[0].file}`,
    full: `/img/${largest.file}`,
  };
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function main() {
  const started = Date.now();
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, 'img'), { recursive: true });

  // ---- Scan categories ----------------------------------------------------
  const categories = [];
  if (fs.existsSync(PHOTOS_DIR)) {
    for (const dir of fs.readdirSync(PHOTOS_DIR, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const files = fs
        .readdirSync(path.join(PHOTOS_DIR, dir.name))
        .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
        .sort();
      if (files.length === 0) continue;
      categories.push({ name: dir.name, slug: slugify(dir.name), files });
    }
  }

  // Order: explicit config order first, then alphabetical
  const order = (config.categoryOrder || []).map((c) => c.toLowerCase());
  categories.sort((a, b) => {
    const ia = order.indexOf(a.name.toLowerCase());
    const ib = order.indexOf(b.name.toLowerCase());
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
    return a.name.localeCompare(b.name);
  });

  // ---- Process photos -----------------------------------------------------
  let total = 0;
  for (const cat of categories) {
    cat.photos = [];
    for (const file of cat.files) {
      const rel = `${cat.name}/${file}`;
      try {
        cat.photos.push(await processPhoto(path.join(PHOTOS_DIR, rel), rel));
        total++;
      } catch (err) {
        console.error(`  ! Skipping ${rel}: ${err.message}`);
      }
    }
    // Newest first by EXIF date; undated photos keep filename order at the end
    cat.photos.sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.file.localeCompare(b.file);
    });
    console.log(`  ${cat.name}: ${cat.photos.length} photos`);
  }
  const nonEmpty = categories.filter((c) => c.photos.length > 0);

  // ---- Pick hero photo ----------------------------------------------------
  const all = nonEmpty.flatMap((c) => c.photos.map((p) => ({ ...p, category: c.name })));
  let hero = null;
  if (config.heroPhoto) hero = all.find((p) => p.rel === config.heroPhoto) || null;
  if (!hero && all.length) {
    hero = [...all].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  }

  // ---- Render pages -------------------------------------------------------
  const ctx = { config, categories: nonEmpty, hero };

  const write = (rel, html) => {
    const out = path.join(DIST, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
  };

  write('index.html', t.homePage(ctx));
  for (const cat of nonEmpty) write(`${cat.slug}/index.html`, t.categoryPage(ctx, cat));
  write('about/index.html', t.aboutPage(ctx));
  write('contact/index.html', t.contactPage(ctx));
  write('404.html', t.notFoundPage(ctx));

  // ---- Aux files ----------------------------------------------------------
  const base = `https://${config.domain}`;
  const urls = ['/', ...nonEmpty.map((c) => `/${c.slug}/`), '/about/', '/contact/'];
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${base}${u}</loc></url>`)
      .join('\n')}\n</urlset>\n`
  );
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${base}/sitemap.xml\n`);
  write('CNAME', `${config.domain}\n`);
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

  // Map of source photo -> thumbnail, used by the admin UI for its grid
  const map = {};
  for (const cat of nonEmpty)
    for (const p of cat.photos) map[p.rel] = { thumb: p.thumb, w: p.width, h: p.height };
  write('photo-map.json', JSON.stringify(map));

  // ---- Static assets ------------------------------------------------------
  copyDir(SITE_ASSETS, path.join(DIST, 'assets'));
  copyDir(ADMIN_DIR, path.join(DIST, 'admin'));

  console.log(
    `Built ${nonEmpty.length} categories, ${total} photos in ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
