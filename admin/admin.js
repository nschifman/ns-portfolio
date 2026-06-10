/*
 * Admin UI: manages photos/ and site.config.json directly through the GitHub
 * REST API. Every change is a commit to main, which triggers the deploy
 * workflow — the live site updates a couple of minutes later.
 */
const OWNER = 'nschifman';
const REPO = 'ns-portfolio';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const TOKEN_KEY = 'nsp_admin_token';
const IMAGE_EXTS = /\.(jpe?g|png|webp)$/i;

const $ = (id) => document.getElementById(id);
let token = localStorage.getItem(TOKEN_KEY) || '';
let photos = []; // [{path, category, name, sha}]
let photoMap = {}; // "Category/file.jpg" -> {thumb}
let configSha = null;
let siteConfig = null;
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
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Create one commit on main containing the given tree changes. */
async function commitTree(message, treeEntries) {
  const ref = await gh(`/git/ref/heads/${BRANCH}`);
  const headSha = ref.object.sha;
  const head = await gh(`/git/commits/${headSha}`);
  const tree = await gh('/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: head.tree.sha, tree: treeEntries }),
  });
  const commit = await gh('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] }),
  });
  await gh(`/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  });
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

const slugify = (s) => s.trim().replace(/\s+/g, ' ');
const sanitizeName = (s) =>
  s.replace(/[^a-zA-Z0-9._ -]/g, '').replace(/\s+/g, '-');

// ---------------------------------------------------------------- Data load
async function loadAll() {
  setBusy(true, 'Loading…');
  const tree = await gh(`/git/trees/${BRANCH}?recursive=1`);
  photos = tree.tree
    .filter((e) => e.type === 'blob' && e.path.startsWith('photos/') && IMAGE_EXTS.test(e.path))
    .map((e) => {
      const [, category, ...rest] = e.path.split('/');
      return { path: e.path, category, name: rest.join('/'), sha: e.sha };
    });

  const cfgEntry = tree.tree.find((e) => e.path === 'site.config.json');
  configSha = cfgEntry?.sha || null;
  const cfgRes = await gh(`/contents/site.config.json?ref=${BRANCH}`);
  siteConfig = JSON.parse(atob(cfgRes.content.replace(/\n/g, '')));
  configSha = cfgRes.sha;

  // Thumbnails come from the live site's build output; brand-new photos
  // won't have one until the next deploy finishes.
  try {
    photoMap = await fetch('/photo-map.json', { cache: 'no-store' }).then((r) =>
      r.ok ? r.json() : {}
    );
  } catch {
    photoMap = {};
  }

  renderPhotos();
  renderConfig();
  renderCategoryPickers();
  setBusy(false);
  notify('');
}

function categoryNames() {
  return [...new Set(photos.map((p) => p.category))].sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------- Rendering
function renderCategoryPickers() {
  const cats = categoryNames();
  const opts = cats.map((c) => `<option value="${c}">${c}</option>`).join('');
  $('uploadCategory').innerHTML = opts || '<option value="">(create one →)</option>';
  $('bulkMoveTarget').innerHTML = opts;
}

function renderPhotos() {
  const root = $('categories');
  const cats = categoryNames();
  $('photoCount').textContent = `${photos.length} photos in ${cats.length} categories`;
  root.innerHTML = '';

  for (const cat of cats) {
    const catPhotos = photos.filter((p) => p.category === cat);
    const section = document.createElement('section');
    section.className = 'panel cat';
    section.innerHTML = `
      <div class="cat-head">
        <h2>${cat} <em>${catPhotos.length}</em></h2>
        <button class="ghost cat-rename">Rename</button>
        <button class="danger cat-delete">Delete category</button>
      </div>
      <div class="grid"></div>`;

    section.querySelector('.cat-rename').onclick = () => renameCategory(cat);
    section.querySelector('.cat-delete').onclick = () => deleteCategory(cat);

    const grid = section.querySelector('.grid');
    for (const p of catPhotos) {
      const thumb = photoMap[p.path.replace(/^photos\//, '')]?.thumb;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <label class="thumb">
          <input type="checkbox" data-path="${p.path}">
          ${thumb ? `<img src="${thumb}" loading="lazy" alt="">` : '<span class="nothumb">processing…</span>'}
        </label>
        <div class="card-meta">
          <span title="${p.name}">${p.name}</span>
          <span class="card-actions">
            <button class="ghost set-hero" title="Use as homepage hero">★</button>
            <button class="danger del" title="Delete">✕</button>
          </span>
        </div>`;
      if (siteConfig?.heroPhoto === p.path.replace(/^photos\//, ''))
        card.querySelector('.set-hero').classList.add('active');
      card.querySelector('.del').onclick = () => deletePhotos([p.path]);
      card.querySelector('.set-hero').onclick = () => setHero(p);
      grid.appendChild(card);
    }
    root.appendChild(section);
  }

  root.addEventListener('change', updateBulkButtons);
  updateBulkButtons();
}

function selectedPaths() {
  return [...document.querySelectorAll('#categories input[type=checkbox]:checked')].map(
    (c) => c.dataset.path
  );
}

function updateBulkButtons() {
  const any = selectedPaths().length > 0;
  $('bulkDelete').classList.toggle('hidden', !any);
  $('bulkMove').classList.toggle('hidden', !any);
  $('bulkMoveTarget').classList.toggle('hidden', !any);
}

function renderConfig() {
  $('cfgAbout').value = siteConfig.about || '';
  $('cfgContact').value = siteConfig.contact || '';
  $('cfgEmail').value = siteConfig.email || '';
  $('cfgInstagram').value = siteConfig.instagram || '';
  $('cfgTagline').value = siteConfig.tagline || '';
  $('cfgDescription').value = siteConfig.description || '';
  $('cfgOrder').value = (siteConfig.categoryOrder || []).join(', ');
}

// ---------------------------------------------------------------- Actions
async function uploadFiles() {
  const cat = slugify($('newCategory').value) || $('uploadCategory').value;
  if (!cat) return notify('Pick or create a category first.', true);
  if (!pendingFiles.length) return;

  try {
    const entries = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const f = pendingFiles[i];
      setBusy(true, `Uploading ${i + 1} of ${pendingFiles.length}: ${f.name}…`);
      const blob = await gh('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({ content: await fileToBase64(f), encoding: 'base64' }),
      });
      entries.push({
        path: `photos/${cat}/${sanitizeName(f.name)}`,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    }
    setBusy(true, 'Committing…');
    const n = entries.length;
    await commitTree(`Add ${n} photo${n > 1 ? 's' : ''} to ${cat}`, entries);
    pendingFiles = [];
    $('uploadList').innerHTML = '';
    $('uploadGo').classList.add('hidden');
    $('newCategory').value = '';
    await loadAll();
    notify(`Uploaded ${n} photo${n > 1 ? 's' : ''} to ${cat}. The site is rebuilding — live in ~2 minutes.`);
    watchBuild();
  } catch (err) {
    setBusy(false);
    notify(`Upload failed: ${err.message}`, true);
  }
}

async function deletePhotos(paths) {
  const n = paths.length;
  if (!confirm(`Delete ${n} photo${n > 1 ? 's' : ''} from the site? This can't be undone from here.`))
    return;
  try {
    setBusy(true, 'Deleting…');
    await commitTree(
      `Remove ${n} photo${n > 1 ? 's' : ''}`,
      paths.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null }))
    );
    await loadAll();
    notify(`Deleted ${n} photo${n > 1 ? 's' : ''}. The site is rebuilding.`);
    watchBuild();
  } catch (err) {
    setBusy(false);
    notify(`Delete failed: ${err.message}`, true);
  }
}

async function movePhotos(paths, targetCat) {
  try {
    setBusy(true, 'Moving…');
    const entries = [];
    for (const path of paths) {
      const p = photos.find((x) => x.path === path);
      if (!p || p.category === targetCat) continue;
      entries.push({ path: `photos/${targetCat}/${p.name}`, mode: '100644', type: 'blob', sha: p.sha });
      entries.push({ path, mode: '100644', type: 'blob', sha: null });
    }
    if (entries.length) await commitTree(`Move ${paths.length} photo(s) to ${targetCat}`, entries);
    await loadAll();
    notify('Moved. The site is rebuilding.');
    watchBuild();
  } catch (err) {
    setBusy(false);
    notify(`Move failed: ${err.message}`, true);
  }
}

async function renameCategory(cat) {
  const next = prompt(`Rename category "${cat}" to:`, cat);
  if (!next || slugify(next) === cat) return;
  const target = slugify(next);
  const paths = photos.filter((p) => p.category === cat).map((p) => p.path);
  try {
    setBusy(true, `Renaming ${cat} → ${target}…`);
    const entries = paths.flatMap((path) => {
      const p = photos.find((x) => x.path === path);
      return [
        { path: `photos/${target}/${p.name}`, mode: '100644', type: 'blob', sha: p.sha },
        { path, mode: '100644', type: 'blob', sha: null },
      ];
    });
    await commitTree(`Rename category ${cat} to ${target}`, entries);
    await loadAll();
    notify(`Renamed to ${target}. The site is rebuilding.`);
    watchBuild();
  } catch (err) {
    setBusy(false);
    notify(`Rename failed: ${err.message}`, true);
  }
}

async function deleteCategory(cat) {
  const paths = photos.filter((p) => p.category === cat).map((p) => p.path);
  if (!confirm(`Delete the entire "${cat}" category (${paths.length} photos)?`)) return;
  try {
    setBusy(true, 'Deleting category…');
    await commitTree(
      `Remove category ${cat}`,
      paths.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null }))
    );
    await loadAll();
    notify(`Deleted ${cat}. The site is rebuilding.`);
    watchBuild();
  } catch (err) {
    setBusy(false);
    notify(`Delete failed: ${err.message}`, true);
  }
}

async function setHero(p) {
  siteConfig.heroPhoto = p.path.replace(/^photos\//, '');
  await saveConfig(`Set hero photo to ${p.name}`);
}

async function saveConfig(message = 'Update site settings') {
  try {
    setBusy(true, 'Saving…');
    const body = JSON.stringify(siteConfig, null, 2) + '\n';
    const res = await gh('/contents/site.config.json', {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: btoa(unescape(encodeURIComponent(body))),
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

// ---------------------------------------------------------------- Wiring
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

$('tokenSave').onclick = async () => {
  const t = $('tokenInput').value.trim();
  if (!t) return;
  $('signinError').textContent = '';
  try {
    await trySignIn(t);
  } catch {
    token = '';
    $('signinError').textContent =
      "That token didn't work. Check it has Contents read/write access to the portfolio repo.";
  }
};

$('signOut').onclick = () => {
  localStorage.removeItem(TOKEN_KEY);
  location.reload();
};

document.querySelectorAll('.tab').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tabpane').forEach((p) => {
      p.classList.toggle('hidden', p.id !== `tab-${btn.dataset.tab}`);
    });
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

function queueFiles(files) {
  const ok = files.filter((f) => IMAGE_EXTS.test(f.name));
  const tooBig = ok.filter((f) => f.size > 45 * 1024 * 1024);
  if (tooBig.length)
    notify(`Skipping ${tooBig.length} file(s) over 45MB — export smaller JPEGs.`, true);
  pendingFiles = pendingFiles.concat(ok.filter((f) => f.size <= 45 * 1024 * 1024));
  $('uploadList').innerHTML = pendingFiles
    .map((f) => `<li>${f.name} <em>${(f.size / 1024 / 1024).toFixed(1)}MB</em></li>`)
    .join('');
  $('uploadGo').classList.toggle('hidden', pendingFiles.length === 0);
}
$('uploadGo').onclick = uploadFiles;

// Bulk actions
$('bulkDelete').onclick = () => deletePhotos(selectedPaths());
$('bulkMove').onclick = () => movePhotos(selectedPaths(), $('bulkMoveTarget').value);

// Config save
$('cfgSave').onclick = () => {
  siteConfig.about = $('cfgAbout').value;
  siteConfig.contact = $('cfgContact').value;
  siteConfig.email = $('cfgEmail').value.trim();
  siteConfig.instagram = $('cfgInstagram').value.trim().replace(/^@/, '');
  siteConfig.tagline = $('cfgTagline').value.trim();
  siteConfig.description = $('cfgDescription').value.trim();
  siteConfig.categoryOrder = $('cfgOrder')
    .value.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  saveConfig();
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
