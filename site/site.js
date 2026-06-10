/* Mobile nav, image fade-in, and lightbox. */
(() => {
  // ---- Mobile nav ----
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open);
    });
  }

  // ---- Fade-in on load ----
  document.querySelectorAll('.ph img').forEach((img) => {
    if (img.complete && img.naturalWidth) img.classList.add('loaded');
    else img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
  });

  // ---- Lightbox ----
  const gallery = document.querySelector('[data-lightbox]');
  if (!gallery) return;

  const items = [...gallery.querySelectorAll('.ph')].map((a) => ({
    full: a.getAttribute('href'),
    srcset: a.dataset.srcset,
  }));
  if (!items.length) return;

  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.innerHTML = `
    <button class="lb-close" aria-label="Close">&times;</button>
    <button class="lb-prev" aria-label="Previous">&#8249;</button>
    <button class="lb-next" aria-label="Next">&#8250;</button>
    <img alt="">
    <div class="lb-count"></div>`;
  document.body.appendChild(lb);

  const lbImg = lb.querySelector('img');
  const lbCount = lb.querySelector('.lb-count');
  let idx = -1;

  const preload = (i) => {
    if (i < 0 || i >= items.length) return;
    const im = new Image();
    im.src = items[i].full;
  };

  const show = (i) => {
    idx = (i + items.length) % items.length;
    lbImg.src = items[idx].full;
    if (items[idx].srcset) {
      lbImg.srcset = items[idx].srcset;
      lbImg.sizes = '94vw';
    }
    lbCount.textContent = `${idx + 1} / ${items.length}`;
    preload(idx + 1);
    preload(idx - 1);
  };

  const open = (i) => {
    show(i);
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  };

  gallery.querySelectorAll('.ph').forEach((a, i) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      open(i);
    });
  });

  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', (e) => {
    if (e.target === lb) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });

  // Swipe
  let touchX = null;
  lb.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
  lb.addEventListener(
    'touchend',
    (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) show(dx > 0 ? idx - 1 : idx + 1);
    },
    { passive: true }
  );
})();
