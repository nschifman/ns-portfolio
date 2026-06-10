/** HTML templates for the static site generator. */

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const paragraphs = (text = '') =>
  text
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n');

function layout(ctx, { title, description, ogImage, path: pagePath, body, preload }) {
  const { config, categories } = ctx;
  const base = `https://${config.domain}`;
  const fullTitle = title ? `${title} — ${config.siteTitle}` : config.siteTitle;
  const desc = description || config.description;
  const og = ogImage ? `${base}${ogImage}` : '';

  const navLinks = [
    ...categories.map((c) => ({ href: `/${c.slug}/`, label: c.name })),
    { href: '/about/', label: 'About' },
    { href: '/contact/', label: 'Contact' },
  ]
    .map(
      (l) =>
        `<a href="${l.href}"${l.href === pagePath ? ' class="active"' : ''}>${esc(l.label)}</a>`
    )
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${base}${pagePath}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${base}${pagePath}">
  ${og ? `<meta property="og:image" content="${og}">` : ''}
  <meta name="twitter:card" content="${og ? 'summary_large_image' : 'summary'}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/styles.css">
  ${preload ? `<link rel="preload" as="image" href="${preload}">` : ''}
</head>
<body>
  <header class="site-header">
    <a class="wordmark" href="/">${esc(config.name)}</a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false">
      <span></span><span></span>
    </button>
    <nav class="site-nav">
        ${navLinks}
    </nav>
  </header>
  <main>
${body}
  </main>
  <footer class="site-footer">
    <span>&copy; ${new Date().getFullYear()} ${esc(config.name)}</span>
    <span class="footer-links">
      ${config.instagram ? `<a href="https://instagram.com/${esc(config.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
      ${config.email ? `<a href="mailto:${esc(config.email)}">Email</a>` : ''}
    </span>
  </footer>
  <script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

/** One photo as a justified-gallery item / lightbox source. */
function photoItem(photo, { eager = false, sizes } = {}) {
  const ar = (photo.width / photo.height).toFixed(4);
  return `<a class="ph" href="${photo.full}" style="--ar:${ar};flex-grow:${Math.round(ar * 100)};flex-basis:${Math.round(ar * 300)}px"
  data-srcset="${photo.srcset}" data-w="${photo.width}" data-h="${photo.height}">
  <img src="${photo.thumb}" srcset="${photo.srcset}"
    sizes="${sizes || '(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 33vw'}"
    width="${photo.width}" height="${photo.height}" alt=""
    loading="${eager ? 'eager' : 'lazy'}" decoding="async"
    style="background-image:url(${photo.blur})">
</a>`;
}

export function homePage(ctx) {
  const { config, categories, hero } = ctx;

  const heroHtml = hero
    ? `    <section class="hero">
      <img src="${hero.full}" srcset="${hero.srcset}" sizes="100vw" alt="" fetchpriority="high"
        style="background-image:url(${hero.blur})">
      <div class="hero-overlay">
        <h1>${esc(config.name)}</h1>
        ${config.tagline ? `<p>${esc(config.tagline)}</p>` : ''}
      </div>
      <div class="hero-scroll" aria-hidden="true">&#8595;</div>
    </section>`
    : `    <section class="hero hero-empty">
      <div class="hero-overlay"><h1>${esc(config.name)}</h1>
      ${config.tagline ? `<p>${esc(config.tagline)}</p>` : ''}</div>
    </section>`;

  const tiles = categories
    .map((c) => {
      const cover = c.photos[0];
      const mid = cover.variants.find((v) => v.w >= 960) || cover.variants[cover.variants.length - 1];
      return `      <a class="tile" href="/${c.slug}/">
        <img src="/img/${mid.file}" alt="${esc(c.name)}" loading="lazy" decoding="async"
          style="background-image:url(${cover.blur})">
        <span class="tile-label"><span>${esc(c.name)}</span><em>${c.photos.length} photos</em></span>
      </a>`;
    })
    .join('\n');

  const body = `${heroHtml}
    <section class="tiles">
${tiles}
    </section>`;

  return layout(ctx, {
    title: '',
    path: '/',
    ogImage: hero ? hero.full : '',
    preload: hero ? hero.full : '',
    body,
  });
}

export function categoryPage(ctx, cat) {
  const items = cat.photos.map((p, i) => photoItem(p, { eager: i < 4 })).join('\n');
  const body = `    <section class="page-head">
      <h1>${esc(cat.name)}</h1>
      ${cat.description ? `<p class="page-sub">${esc(cat.description)}</p>` : ''}
    </section>
    <section class="gallery" data-lightbox>
${items}
    </section>`;
  return layout(ctx, {
    title: cat.name,
    description: `${cat.name} — ${ctx.config.siteTitle}`,
    path: `/${cat.slug}/`,
    ogImage: cat.photos[0]?.full,
    body,
  });
}

export function aboutPage(ctx) {
  const { config } = ctx;
  const body = `    <section class="page-head"><h1>About</h1></section>
    <section class="prose">
${paragraphs(config.about)}
    </section>`;
  return layout(ctx, { title: 'About', path: '/about/', body });
}

export function contactPage(ctx) {
  const { config } = ctx;
  const body = `    <section class="page-head"><h1>Contact</h1></section>
    <section class="prose">
${paragraphs(config.contact)}
      <ul class="contact-list">
        ${config.email ? `<li><span>Email</span><a href="mailto:${esc(config.email)}">${esc(config.email)}</a></li>` : ''}
        ${config.instagram ? `<li><span>Instagram</span><a href="https://instagram.com/${esc(config.instagram)}" target="_blank" rel="noopener">@${esc(config.instagram)}</a></li>` : ''}
      </ul>
    </section>`;
  return layout(ctx, { title: 'Contact', path: '/contact/', body });
}

export function notFoundPage(ctx) {
  const body = `    <section class="prose notfound">
      <h1>404</h1>
      <p>That page doesn't exist. <a href="/">Back to the photos</a>.</p>
    </section>`;
  return layout(ctx, { title: 'Not Found', path: '/404.html', body });
}
