/*
 * Admin UI: manages the flat photos/ directory and gallery.json (categories +
 * per-photo tags) directly through the GitHub API. Every change is tracked 
 * locally, then saved in a bulk commit when "Save All Changes" is clicked.
 */
const OWNER = 'nschifman';
const REPO = 'ns-portfolio';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const TOKEN_KEY = 'nsp_admin_token';
const IMAGE_EXTS = /\.(jpe?g|png|webp)$/i;

const $ = (id) => document.getElementById(id);
let token = localStorage.getItem(TOKEN_KEY) || '';

let files = []; // [{file, path, sha}] — image files that exist in photos/
let gallery = { categories: [], photos: {} }; // the manifest
let photoMap = {}; // "file.jpg" -> {thumb} from the last build
let localThumbs = {}; // "file.jpg" -> object URL, for just-uploaded photos
let siteConfig = null;
let configSha = null;
let pendingFiles = [];

// --- Global Save State ---
let pendingEntries = []; // Holds uncommitted file additions and deletions
let hasUnsavedChanges = false;

function markDirty() {
  hasUnsavedChanges = true;
  $('globalSaveBtn').classList.remove('hidden');
}

window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
  }
});
// -------------------------

// ---------------------------------------------------------------- API helpers
async function gh(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const friendly =
      res.status === 403 && body.includes('not accessible')
        ? 'Your access token can no longer write to the repo (it may have expired). Sign out, create a fresh token with Contents = Read and write, and log in again.'
        : `GitHub API ${res.status}: ${body.slice(0, 200)}`;
    const err = new Error(friendly);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const b64 = (str) => btoa(unescape(encodeURIComponent(str)));
const galleryJSON = () => JSON.stringify(gallery, null, 2) + '\n';
const galleryEntry = () => ({ path: 'gallery.json', mode: '100644', type: 'blob', content: galleryJSON() });
const configEntry = () => ({ path: 'site.config.json', mode: '100644', type: 'blob', content: JSON.stringify(siteConfig, null, 2) + '\n' });

let writeQueue = Promise.resolve();
function serialize(fn) {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => {},
    () => {}
  );
  return run;
}

/** Commit to main, serialized against every other admin write. */
function commit(message, extraEntries = []) {
  return serialize(() => commitNow(message, extraEntries));
}

async function commitNow(message, extraEntries = []) {
  for (let attempt = 0; ; attempt++) {
    const ref = await gh(`/git/ref/heads/${BRANCH}`);
    const headSha = ref.object.sha;
    const head = await gh(`/git/commits/${headSha}`);
    const tree = await gh('/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: head.tree.sha, tree: [...extraEntries, galleryEntry()] }),
    });
    const c = await gh('/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] }),
    });
    try {
      await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
      return;
    } catch (err) {
      if (err.status === 422 && attempt < 7) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1) + Math.random() * 300));
        continue; // branch moved — rebuild onto the new tip and try again
      }
      throw err;
    }
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------- UI helpers
function notify(msg, isError = false) {
  const el = $('notice');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.toggle('hidden', !msg);
}
function setBusy(busy, msg = '') {
  document.body.classList.toggle('busy', busy);
  if (msg) notify(msg);
}
function showProgress(done, total, label) {
  const wrap = $('uploadProgress');
  wrap.classList.remove('hidden');
  const pct = total ? Math.round((done / total) * 100) : 0;
  wrap.querySelector('.bar').style.width = `${pct}%`;
  wrap.querySelector('.progress-label').textContent = label || `Uploading ${done} of ${total}…`;
}
function hideProgress() {
  $('uploadProgress').classList.add('hidden');
}
const sanitizeName = (s) => s.replace(/[^a-zA-Z0-9._ -]/g, '').replace(/\s+/g, '-');
const cleanCat = (s) => s.trim().replace(/\s+/g, ' ');

const categoryNames = () => gallery.categories.map((c) => (typeof c === 'string' ? c : c.name));
const tagsOf = (file) => gallery.photos[file]?.categories || [];

// ---------------------------------------------------------------- Data load
async function loadAll() {
  setBusy(true, 'Loading…');
  const tree = await gh(`/git/trees/${BRANCH}?recursive=1`);
  files = tree.tree
    .filter((e) => e.type === 'blob' && /^photos\/[^/]+$/.test(e.path) && IMAGE_EXTS.test(e.path))
    .map((e) => ({ file: e.path.slice('photos/'.length), path: e.path, sha: e.sha }));

  try {
    const g = await gh(`/contents/gallery.json?ref=${BRANCH}`);
    const parsed = JSON.parse(atob(g.content.replace(/\n/g, '')));
    gallery = { categories: parsed.categories || [], photos: parsed.photos || {} };
  } catch (err) {
    if (err.status === 404) gallery = { categories: [], photos: {} };
    else throw err;
  }
  gallery.categories = gallery.categories.map((c) =>
    typeof c === 'string' ? { name: c, description: '' } : { name: c.name, description: c.description || '' }
  );

  const cfg = await gh(`/contents/site.config.json?ref=${BRANCH}`);
  siteConfig = JSON.parse(atob(cfg.content.replace(/\n/g, '')));
  configSha = cfg.sha;

  try {
    photoMap = await fetch('/photo-map.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {}));
  } catch {
    photoMap = {};
  }

  renderPhotos();
  renderCategories();
  renderUploadCats();
  renderConfig();
  setBusy(false);
  notify('');
}

// ---------------------------------------------------------------- Rendering
function renderUploadCats() {
  $('uploadCats').innerHTML =
    categoryNames()
      .map(
        (c) =>
          `<label class="chip"><input type="checkbox" value="${encodeURIComponent(c)}"><span>${c}</span></label>`
      )
      .join('') || '<span class="muted">No categories yet — add one below or in the Categories tab.</span>';
}

function renderPhotos() {
  const grid = $('photoGrid');
  const cats = categoryNames();
  $('photoCount').textContent = `${files.length} photos · ${cats.length} categories`;

  const sorted = [...files].sort((a, b) => {
    const ua = tagsOf(a.file).length === 0;
    const ub = tagsOf(b.file).length === 0;
    if (ua !== ub) return ua ? -1 : 1;
    return a.file.localeCompare(b.file);
  });

  grid.className = 'panel';
  grid.innerHTML = '<div class="grid"></div>';
  const g = grid.firstChild;

  for (const p of sorted) {
    const thumb = photoMap[p.file]?.thumb || localThumbs[p.file];
    const tags = tagsOf(p.file);
    const card = document.createElement('div');
    card.className = 'card' + (tags.length === 0 ? ' untagged' : '');
    card.innerHTML = `
      <label class="thumb">
        <input type="checkbox" class="sel" data-file="${p.file}">
        ${thumb ? `<img src="${thumb}" loading="lazy" alt="">` : '<span class="nothumb">processing…</span>'}
        ${tags.length === 0 ? '<span class="badge">untagged</span>' : ''}
      </label>
      <div class="card-tags"></div>
      <div class="card-meta">
        <span title="${p.file}">${p.file}</span>
        <span class="card-actions">
          <button class="ghost set-hero" title="Use as homepage hero">★</button>
          <button class="danger del" title="Delete">✕</button>
        </span>
      </div>`;

    const tagWrap = card.querySelector('.card-tags');
    for (const c of cats) {
      const on = tags.includes(c);
      const b = document.createElement('button');
      b.className = 'tag' + (on ? ' on' : '');
      b.textContent = c;
      b.onclick = () => toggleTag(p.file, c);
      tagWrap.appendChild(b);
    }

    if (siteConfig?.heroPhoto === p.file) card.querySelector('.set-hero').classList.add('active');
    card.querySelector('.del').onclick = () => deletePhotos([p.file]);
    card.querySelector('.set-hero').onclick = () => setHero(p.file);
    g.appendChild(card);
  }

  g.addEventListener('change', (e) => {
    if (e.target.classList.contains('sel')) updateBulk();
  });
  $('bulkCat').innerHTML = cats.map((c) => `<option value="${encodeURIComponent(c)}">${c}</option>`).join('');
  updateBulk();
}

function selected() {
  return [...document.querySelectorAll('#photoGrid .sel:checked')].map((c) => c.dataset.file);
}
function updateBulk() {
  const any = selected().length > 0;
  const hasCats = categoryNames().length > 0;
  $('bulkDelete').classList.toggle('hidden', !any);
  $('bulkAdd').classList.toggle('hidden', !any || !hasCats);
  $('bulkRemove').classList.toggle('hidden', !any || !hasCats);
  $('bulkCat').classList.toggle('hidden', !any || !hasCats);
}

function renderCategories() {
  const list = $('categoryList');
  list.innerHTML = '';
  gallery.categories.forEach((c, i) => {
    const count = files.filter((f) => tagsOf(f.file).includes(c.name)).length;
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="cat-name">${c.name}</span>
      <em class="cat-count">${count}</em>
      <span class="cat-ctrls">
        <button class="ghost up" ${i === 0 ? 'disabled' : ''} title="Move up">↑</button>
        <button class="ghost down" ${i === gallery.categories.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
        <button class="ghost rename">Rename</button>
        <button class="danger del">Delete</button>
      </span>`;
    li.querySelector('.up').onclick = () => moveCategory(i, -1);
    li.querySelector('.down').onclick = () => moveCategory(i, 1);
    li.querySelector('.rename').onclick = () => renameCategory(c.name);
    li.querySelector('.del').onclick = () => deleteCategory(c.name);
    list.appendChild(li);
  });
  if (!gallery.categories.length)
    list.innerHTML = '<li class="muted">No categories yet. Add one below.</li>';
}

function renderConfig() {
  $('cfgShowAbout').checked = siteConfig.showAbout !== false;
  $('cfgShowContact').checked = siteConfig.showContact !== false;
  $('cfgAbout').value = siteConfig.about || '';
  $('cfgContact').value = siteConfig.contact || '';
  $('cfgEmail').value = siteConfig.email || '';
  $('cfgInstagram').value = siteConfig.instagram || '';
  $('cfgTagline').value = siteConfig.tagline || '';
  $('cfgDescription').value = siteConfig.description || '';
}

// ---------------------------------------------------------------- State updates
async function toggleTag(file, cat) {
  const entry = (gallery.photos[file] ||= { categories: [] });
  entry.categories = entry.categories || [];
  const i = entry.categories.indexOf(cat);
  if (i === -1) entry.categories.push(cat);
  else entry.categories.splice(i, 1);
  
  markDirty();
  renderPhotos();
}

function uniqueName(name, set) {
  if (!set.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let cand;
  do {
    cand = `${base}-${Math.random().toString(36).slice(2, 7)}${ext}`;
  } while (set.has(cand));
  return cand;
}

async function mapLimit(items, limit, fn, onProgress) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
      onProgress(++done, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function uploadFiles() {
  if (!pendingFiles.length) return;
  const cats = [...document.querySelectorAll('#uploadCats input:checked')].map((c) =>
    decodeURIComponent(c.value)
  );
  const batch = pendingFiles;
  try {
    setBusy(true);
    const existing = new Set(files.map((x) => x.file));
    const names = batch.map((f) => {
      const name = uniqueName(sanitizeName(f.name), existing);
      existing.add(name);
      return name;
    });

    showProgress(0, batch.length);
    const entries = await mapLimit(
      batch,
      4,
      async (f, i) => {
        const blob = await gh('/git/blobs', {
          method: 'POST',
          body: JSON.stringify({ content: await fileToBase64(f), encoding: 'base64' }),
        });
        return { path: `photos/${names[i]}`, mode: '100644', type: 'blob', sha: blob.sha };
      },
      (done, total) => showProgress(done, total)
    );

    batch.forEach((f, i) => {
      gallery.photos[names[i]] = { categories: cats };
      localThumbs[names[i]] = URL.createObjectURL(f);
      files.push({ file: names[i], path: `photos/${names[i]}`, sha: entries[i].sha });
    });

    pendingEntries.push(...entries);
    markDirty();
    renderPhotos();

    pendingFiles = [];
    $('uploadList').innerHTML = '';
    $('uploadGo').classList.add('hidden');
    document.querySelectorAll('#uploadCats input:checked').forEach((c) => (c.checked = false));
    setBusy(false);
    hideProgress();
    notify(`Ready to save. ${entries.length} photo(s) added to the queue.`);
  } catch (err) {
    setBusy(false);
    hideProgress();
    notify(`Upload failed: ${err.message}`, true);
  }
}

async function deletePhotos(fileNames) {
  const n = fileNames.length;
  if (!confirm(`Delete ${n} photo${n > 1 ? 's' : ''}? This will queue them for deletion.`)) return;
  
  for (const f of fileNames) delete gallery.photos[f];
  const entries = fileNames.map((f) => ({ path: `photos/${f}`, mode: '100644', type: 'blob', sha: null }));
  pendingEntries.push(...entries);
  
  files = files.filter(f => !fileNames.includes(f.file));
  markDirty();
  renderPhotos();
}

async function setHero(file) {
  siteConfig.heroPhoto = file;
  markDirty();
  renderPhotos();
}

// ---------------------------------------------------------------- Bulk actions
function bulkTag(add) {
  const cat = decodeURIComponent($('bulkCat').value);
  const sel = selected();
  if (!cat || !sel.length) return;
  for (const f of sel) {
    const entry = (gallery.photos[f] ||= { categories: [] });
    entry.categories = entry.categories || [];
    const i = entry.categories.indexOf(cat);
    if (add && i === -1) entry.categories.push(cat);
    if (!add && i !== -1) entry.categories.splice(i, 1);
  }
  markDirty();
  renderPhotos();
}

// ---------------------------------------------------------------- Category actions
function addCategory(name) {
  const n = cleanCat(name);
  if (!n) return;
  if (categoryNames().some((c) => c.toLowerCase() === n.toLowerCase()))
    return notify('That category already exists.', true);
  gallery.categories.push({ name: n, description: '' });
  markDirty();
  renderCategories();
  renderUploadCats();
}

function moveCategory(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= gallery.categories.length) return;
  const arr = gallery.categories;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  markDirty();
  renderCategories();
}

function renameCategory(name) {
  const next = prompt(`Rename category "${name}" to:`, name);
  if (!next) return;
  const n = cleanCat(next);
  if (n === name) return;
  if (categoryNames().some((c) => c.toLowerCase() === n.toLowerCase()))
    return notify('That category already exists.', true);
  const cat = gallery.categories.find((c) => c.name === name);
  if (cat) cat.name = n;
  for (const f of Object.keys(gallery.photos)) {
    const cs = gallery.photos[f].categories;
    if (cs) gallery.photos[f].categories = cs.map((c) => (c === name ? n : c));
  }
  markDirty();
  renderCategories();
  renderPhotos();
  renderUploadCats();
}

function deleteCategory(name) {
  const count = files.filter((f) => tagsOf(f.file).includes(name)).length;
  if (!confirm(`Delete category "${name}"? ${count} photo(s) will be untagged from it.`))
    return;
  gallery.categories = gallery.categories.filter((c) => c.name !== name);
  for (const f of Object.keys(gallery.photos)) {
    const cs = gallery.photos[f].categories;
    if (cs) gallery.photos[f].categories = cs.filter((c) => c !== name);
  }
  markDirty();
  renderCategories();
  renderPhotos();
  renderUploadCats();
}

// ---------------------------------------------------------------- Build status
let buildTimer = null;
async function refreshBuildStatus() {
  try {
    const runs = await gh(`/actions/runs?branch=${BRANCH}&per_page=1`);
    const run = runs.workflow_runs?.[0];
    const el = $('buildStatus');
    if (!run) return;
    if (run.status !== 'completed') {
      el.textContent = '● building…';
      el.className = 'build-status pending';
    } else if (run.conclusion === 'success') {
      el.textContent = '● live';
      el.className = 'build-status ok';
      clearInterval(buildTimer);
      buildTimer = null;
    } else {
      el.textContent = '● build failed';
      el.className = 'build-status fail';
      clearInterval(buildTimer);
      buildTimer = null;
    }
  } catch {
    /* token may lack Actions read; not fatal */
  }
}
function watchBuild() {
  refreshBuildStatus();
  if (!buildTimer) buildTimer = setInterval(refreshBuildStatus, 10000);
}

// ---------------------------------------------------------------- Auth + wiring
function showApp() {
  $('signin').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('signOut').classList.remove('hidden');
  loadAll().catch((err) => notify(err.message, true));
  watchBuild();
}

async function trySignIn(t) {
  token = t;
  const repo = await gh('');
  if (!repo.permissions || !repo.permissions.push) {
    token = '';
    const err = new Error('no write access');
    err.noWrite = true;
    throw err;
  }
  localStorage.setItem(TOKEN_KEY, t);
  showApp();
}

$('loginBtn').onclick = async () => {
  $('signinError').textContent = '';
  if (token) {
    try {
      await trySignIn(token);
      return;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      token = '';
    }
  }
  $('loginBtn').classList.add('hidden');
  $('tokenRow').classList.remove('hidden');
  $('tokenInput').focus();
};

async function submitToken() {
  const t = $('tokenInput').value.trim();
  if (!t) return;
  $('signinError').textContent = '';
  try {
    await trySignIn(t);
  } catch (err) {
    token = '';
    $('signinError').textContent = err.noWrite
      ? 'That token can only read this repo. Create a new one with Contents set to "Read and write" (link below).'
      : "That token didn't work. Make sure it has Contents read/write access to the repo.";
  }
}
$('tokenContinue').onclick = submitToken;
$('tokenInput').addEventListener('keydown', (e) => e.key === 'Enter' && submitToken());

$('signOut').onclick = () => {
  localStorage.removeItem(TOKEN_KEY);
  location.reload();
};

document.querySelectorAll('.tab').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tabpane').forEach((p) =>
      p.classList.toggle('hidden', p.id !== `tab-${btn.dataset.tab}`)
    );
  };
});

// Upload wiring
const dz = $('dropzone');
$('pickFiles').onclick = () => $('fileInput').click();
$('fileInput').onchange = (e) => queueFiles([...e.target.files]);
dz.addEventListener('dragover', (e) => {
  e.preventDefault();
  dz.classList.add('over');
});
dz.addEventListener('dragleave', () => dz.classList.remove('over'));
dz.addEventListener('drop', (e) => {
  e.preventDefault();
  dz.classList.remove('over');
  queueFiles([...e.dataTransfer.files]);
});
function queueFiles(list) {
  const ok = list.filter((f) => IMAGE_EXTS.test(f.name));
  const tooBig = ok.filter((f) => f.size > 45 * 1024 * 1024);
  if (tooBig.length) notify(`Skipping ${tooBig.length} file(s) over 45MB — export smaller JPEGs.`, true);
  pendingFiles = pendingFiles.concat(ok.filter((f) => f.size <= 45 * 1024 * 1024));
  $('uploadList').innerHTML = pendingFiles
    .map((f) => `<li>${f.name} <em>${(f.size / 1024 / 1024).toFixed(1)}MB</em></li>`)
    .join('');
  $('uploadGo').classList.toggle('hidden', pendingFiles.length === 0);
}
$('uploadGo').onclick = uploadFiles;
$('uploadAddCat').onclick = () => {
  const n = cleanCat($('uploadNewCat').value);
  if (n) {
    addCategory(n);
    $('uploadNewCat').value = '';
  }
};

// Bulk + category wiring
$('bulkDelete').onclick = () => deletePhotos(selected());
$('bulkAdd').onclick = () => bulkTag(true);
$('bulkRemove').onclick = () => bulkTag(false);
$('addCat').onclick = () => {
  addCategory($('newCatName').value);
  $('newCatName').value = '';
};

// Config save wiring
$('cfgSave').onclick = () => {
  siteConfig.showAbout = $('cfgShowAbout').checked;
  siteConfig.showContact = $('cfgShowContact').checked;
  siteConfig.about = $('cfgAbout').value;
  siteConfig.contact = $('cfgContact').value;
  siteConfig.email = $('cfgEmail').value.trim();
  siteConfig.instagram = $('cfgInstagram').value.trim().replace(/^@/, '');
  siteConfig.tagline = $('cfgTagline').value.trim();
  siteConfig.description = $('cfgDescription').value.trim();
  
  markDirty();
  notify("Settings queued for save.");
};

// Global Save Execution
$('globalSaveBtn').onclick = async () => {
  if (!hasUnsavedChanges) return;
  try {
    setBusy(true, 'Saving all changes…');
    // Combine pending additions/deletions and the full site config
    const entriesToCommit = [...pendingEntries, configEntry()]; 
    await commit('Bulk update from admin panel', entriesToCommit);
    
    // Clear out pending states
    pendingEntries = [];
    hasUnsavedChanges = false;
    $('globalSaveBtn').classList.add('hidden');
    
    await loadAll();
    notify('Saved. The site is rebuilding — live in ~2 minutes.');
    watchBuild();
  } catch (err) {
    setBusy(false);
    notify(`Save failed: ${err.message}`, true);
  }
};

// Boot
if (token) {
  trySignIn(token).catch(() => {
    localStorage.removeItem(TOKEN_KEY);
    token = '';
    $('signin').classList.remove('hidden');
  });
} else {
  $('signin').classList.remove('hidden');
}
