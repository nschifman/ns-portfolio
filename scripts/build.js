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

/** Load gallery.json (categories + per-photo tags); tolerate a missing file. */
function loadGallery() {
  const p = path.join(ROOT, 'gallery.json');
  if (!fs.existsSync(p)) return { categories: [], photos: {} };
  const g = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { categories: g.categories || [], photos: g.photos || {} };
}

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

  // ---- Load manifest + scan photos (flat) ---------------------------------
  const manifest = loadGallery();
  const files = fs.existsSync(PHOTOS_DIR)
    ? fs
        .readdirSync(PHOTOS_DIR, { withFileTypes: true })
        .filter((e) => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase()))
        .map((e) => e.name)
        .sort()
    : [];

  // Process each photo once; key the result by filename
  let total = 0;
  const byFile = {};
  for (const file of files) {
    try {
      byFile[file] = await processPhoto(path.join(PHOTOS_DIR, file), file);
      total++;
    } catch (err) {
      console.error(`  ! Skipping ${file}: ${err.message}`);
    }
  }

  const tagsFor = (file) => manifest.photos[file]?.categories || [];

  // ---- Build categories from manifest order -------------------------------
  const sortByDate = (a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.file.localeCompare(b.file);
  };

  const categories = manifest.categories
    .map((c) => {
      const name = typeof c === 'string' ? c : c.name;
      const description = typeof c === 'string' ? '' : c.description || '';
      const photos = files
        .filter((f) => byFile[f] && tagsFor(f).includes(name))
        .map((f) => byFile[f])
        .sort(sortByDate);
      return { name, slug: slugify(name), description, photos };
    })
    .filter((c) => c.photos.length > 0);
  for (const cat of categories) console.log(`  ${cat.name}: ${cat.photos.length} photos`);
  const nonEmpty = categories;

  const untagged = files.filter((f) => byFile[f] && tagsFor(f).length === 0).length;
  if (untagged) console.log(`  (${untagged} untagged photo(s) hidden from the public site)`);

  // ---- Pick hero photo ----------------------------------------------------
  const tagged = files.filter((f) => byFile[f] && tagsFor(f).length > 0).map((f) => byFile[f]);
  let hero = null;
  if (config.heroPhoto) hero = byFile[config.heroPhoto] || null;
  if (!hero && tagged.length) hero = [...tagged].sort(sortByDate)[0];

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

  // Map of every photo -> thumbnail, used by the admin UI for its grid
  // (keyed by bare filename; includes untagged photos so they can be tagged)
  const map = {};
  for (const file of files)
    if (byFile[file]) map[file] = { thumb: byFile[file].thumb, w: byFile[file].width, h: byFile[file].height };
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
