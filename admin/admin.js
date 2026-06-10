/*
 * Admin UI: manages the flat photos/ directory and gallery.json (categories +
 * per-photo tags) directly through the GitHub API. Every change is a commit to
 * main, which triggers the deploy workflow — the live site updates a couple of
 * minutes later.
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
let photoMap = {}; // "file.jpg" -> {thumb}
let siteConfig = null;
let configSha = null;
let pendingFiles = [];

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
    const err = new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const b64 = (str) => btoa(unescape(encodeURIComponent(str)));
const galleryJSON = () => JSON.stringify(gallery, null, 2) + '\n';
const galleryEntry = () => ({ path: 'gallery.json', mode: '100644', type: 'blob', content: galleryJSON() });

/** Create one commit on main with the given tree changes, always including
 *  the current gallery.json so metadata stays in sync with file changes.
 *  Retries against a fresh tip if the branch moved underneath us (e.g. the
 *  deploy workflow committed optimized photos back), which GitHub rejects as
 *  a non-fast-forward (422). Our change is rebased onto the new tip each try. */
async function commit(message, extraEntries = []) {
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
      if (err.status === 422 && attempt < 4) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
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

  // gallery.json (may not exist yet)
  try {
    const g = await gh(`/contents/gallery.json?ref=${BRANCH}`);
    const parsed = JSON.parse(atob(g.content.replace(/\n/g, '')));
    gallery = { categories: parsed.categories || [], photos: parsed.photos || {} };
  } catch (err) {
    if (err.status === 404) gallery = { categories: [], photos: {} };
    else throw err;
  }
  // Normalize category entries to {name, description}
  gallery.categories = gallery.categories.map((c) =>
    typeof c === 'string' ? { name: c, description: '' } : { name: c.name, description: c.description || '' }
  );

  // site.config.json
  const cfg = await gh(`/contents/site.config.json?ref=${BRANCH}`);
  siteConfig = JSON.parse(atob(cfg.content.replace(/\n/g, '')));
  configSha = cfg.sha;

  // Thumbnails from the last build (new photos won't have one until next deploy)
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

  // Untagged first so they stand out, then alphabetical
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
    const thumb = photoMap[p.file]?.thumb;
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
  $('cfgAbout').value = siteConfig.about || '';
  $('cfgContact').value = siteConfig.contact || '';
  $('cfgEmail').value = siteConfig.email || '';
  $('cfgInstagram').value = siteConfig.instagram || '';
  $('cfgTagline').value = siteConfig.tagline || '';
  $('cfgDescription').value = siteConfig.description || '';
}

// ---------------------------------------------------------------- Photo actions
async function runCommit(message, extraEntries, okMsg) {
  try {
    setBusy(true, 'Saving…');
    await commit(message, extraEntries);
    await loadAll();
    notify(okMsg + ' The site is rebuilding — live in ~2 minutes.');
    watchBuild();
  } catch (err) {
    setBusy(false);
    notify(`Failed: ${err.message}`, true);
  }
}

async function toggleTag(file, cat) {
  const entry = (gallery.photos[file] ||= { categories: [] });
  entry.categories = entry.categories || [];
  const i = entry.categories.indexOf(cat);
  if (i === -1) entry.categories.push(cat);
  else entry.categories.splice(i, 1);
  await runCommit(`Tag ${file}`, [], 'Saved.');
}

async function uploadFiles() {
  if (!pendingFiles.length) return;
  const cats = [...document.querySelectorAll('#uploadCats input:checked')].map((c) =>
    decodeURIComponent(c.value)
  );
  try {
    const entries = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const f = pendingFiles[i];
      setBusy(true, `Uploading ${i + 1} of ${pendingFiles.length}: ${f.name}…`);
      let name = sanitizeName(f.name);
      // Avoid clobbering an existing file
      const existing = new Set(files.map((x) => x.file));
      if (existing.has(name)) {
        const dot = name.lastIndexOf('.');
        name = `${name.slice(0, dot)}-${Date.now().toString(36)}${name.slice(dot)}`;
      }
      const blob = await gh('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({ content: await fileToBase64(f), encoding: 'base64' }),
      });
      entries.push({ path: `photos/${name}`, mode: '100644', type: 'blob', sha: blob.sha });
      gallery.photos[name] = { categories: cats };
    }
    setBusy(true, 'Committing…');
    const n = entries.length;
    await commit(`Add ${n} photo${n > 1 ? 's' : ''}${cats.length ? ' to ' + cats.join(', ') : ''}`, entries);
    pendingFiles = [];
    $('uploadList').innerHTML = '';
    $('uploadGo').classList.add('hidden');
    document.querySelectorAll('#uploadCats input:checked').forEach((c) => (c.checked = false));
    await loadAll();
    notify(`Uploaded ${n} photo${n > 1 ? 's' : ''}. The site is rebuilding — live in ~2 minutes.`);
    watchBuild();
  } catch (err) {
    setBusy(false);
    notify(`Upload failed: ${err.message}`, true);
  }
}

async function deletePhotos(fileNames) {
  const n = fileNames.length;
  if (!confirm(`Delete ${n} photo${n > 1 ? 's' : ''}? This can't be undone from here.`)) return;
  for (const f of fileNames) delete gallery.photos[f];
  const entries = fileNames.map((f) => ({ path: `photos/${f}`, mode: '100644', type: 'blob', sha: null }));
  await runCommit(`Remove ${n} photo${n > 1 ? 's' : ''}`, entries, `Deleted ${n} photo${n > 1 ? 's' : ''}.`);
}

async function setHero(file) {
  siteConfig.heroPhoto = file;
  await saveConfig(`Set hero photo to ${file}`);
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
  runCommit(`${add ? 'Tag' : 'Untag'} ${sel.length} photos: ${cat}`, [], 'Saved.');
}

// ---------------------------------------------------------------- Category actions
function addCategory(name) {
  const n = cleanCat(name);
  if (!n) return;
  if (categoryNames().some((c) => c.toLowerCase() === n.toLowerCase()))
    return notify('That category already exists.', true);
  gallery.categories.push({ name: n, description: '' });
  runCommit(`Add category ${n}`, [], `Added "${n}".`);
}

function moveCategory(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= gallery.categories.length) return;
  const arr = gallery.categories;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  runCommit('Reorder categories', [], 'Reordered.');
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
  runCommit(`Rename category ${name} to ${n}`, [], `Renamed to "${n}".`);
}

function deleteCategory(name) {
  const count = files.filter((f) => tagsOf(f.file).includes(name)).length;
  if (!confirm(`Delete category "${name}"? ${count} photo(s) will be untagged from it (photos are kept).`))
    return;
  gallery.categories = gallery.categories.filter((c) => c.name !== name);
  for (const f of Object.keys(gallery.photos)) {
    const cs = gallery.photos[f].categories;
    if (cs) gallery.photos[f].categories = cs.filter((c) => c !== name);
  }
  runCommit(`Delete category ${name}`, [], `Deleted "${name}".`);
}

// ---------------------------------------------------------------- Site config
async function saveConfig(message = 'Update site settings') {
  try {
    setBusy(true, 'Saving…');
    const res = await gh('/contents/site.config.json', {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: b64(JSON.stringify(siteConfig, null, 2) + '\n'),
        sha: configSha,
        branch: BRANCH,
      }),
    });
    configSha = res.content.sha;
    setBusy(false);
    renderPhotos();
    notify('Saved. The site is rebuilding — live in ~2 minutes.');
    watchBuild();
  } catch (err) {
    setBusy(false);
    notify(`Save failed: ${err.message}`, true);
  }
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
  await gh(''); // GET the repo — validates token + access
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
  } catch {
    token = '';
    $('signinError').textContent =
      "That token didn't work. Make sure it has Contents read/write access to the repo.";
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

// Config save
$('cfgSave').onclick = () => {
  siteConfig.about = $('cfgAbout').value;
  siteConfig.contact = $('cfgContact').value;
  siteConfig.email = $('cfgEmail').value.trim();
  siteConfig.instagram = $('cfgInstagram').value.trim().replace(/^@/, '');
  siteConfig.tagline = $('cfgTagline').value.trim();
  siteConfig.description = $('cfgDescription').value.trim();
  saveConfig();
};

// Boot — auto-enter if a stored token still works, else show the Login button
if (token) {
  trySignIn(token).catch(() => {
    localStorage.removeItem(TOKEN_KEY);
    token = '';
    $('signin').classList.remove('hidden');
  });
} else {
  $('signin').classList.remove('hidden');
}
