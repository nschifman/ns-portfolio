# Noah Schifman Photography

Photography portfolio at [noahschifman.com](https://noahschifman.com). Free to run:
photos live in this repo, GitHub Actions builds a fully static site, GitHub Pages
hosts it, and the domain points here through Cloudflare DNS.

## How it works

```
/admin (private UI) ──GitHub API──▶  photos/*.jpg  +  gallery.json  +  site.config.json
                                            │
                            GitHub Action (every push to main)
                                            │  compress originals → generate WebP
                                            │  variants → render static HTML
                                            ▼
                                GitHub Pages → noahschifman.com
```

- **Photos live flat in `photos/`. Categories are tags**, defined in `gallery.json`.
  A single photo can belong to several categories at once. Add, rename, delete, and
  reorder categories from the admin page — nothing moves on disk.
- Within a category, photos sort newest-first by the date they were taken (EXIF).
- A photo with no categories stays hidden from the public site until you tag it.
- Every change to `main` redeploys the site automatically (~2 minutes).
- Huge uploads are fine: CI re-compresses anything over 3000px / 4MB in place so
  the repo stays small, while the site serves crisp WebP up to 2560px.

## Managing the site (the easy way): `/admin`

Go to **noahschifman.com/admin**. From there you can:

- **Upload photos** — drag & drop, and tick which categories to tag them with
- **Tag / untag photos** (each photo shows toggle chips for every category), delete
  photos, pick the homepage hero (★)
- **Manage categories** — add, rename, delete, and reorder them in the Categories tab
- **Edit the About and Contact pages**, tagline, email, Instagram

### One-time setup: create your access token

The admin page is powered by a GitHub token that only you have. To create one:

1. Open [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. Name it `portfolio admin`, set **Expiration** to 1 year
3. **Repository access** → *Only select repositories* → choose `ns-portfolio`
4. **Permissions → Repository permissions**: set **Contents** to *Read and write*,
   and **Actions** to *Read-only* (this lets the admin page show build status)
5. Generate, copy, and paste it into the sign-in box at `/admin`

The token is stored only in your browser. Repeat on each device you want to manage
the site from, and once a year when it expires.

## Managing the site (the manual way)

The admin page is just a convenience — everything also works directly:

- Upload: on github.com, open the `photos/` folder → *Add file → Upload files*
- Categories/tags: edit `gallery.json` (a list of categories, plus a map of each
  photo filename to the categories it belongs to)
- Pages/text: edit `site.config.json`

## First-time launch checklist

1. Merge this to `main` — the site builds and deploys automatically
2. In repo **Settings → Pages**, confirm the source is *GitHub Actions* and the
   custom domain is still `noahschifman.com` (Cloudflare DNS needs no changes)
3. Create your admin token (above) and sign in at `/admin`
4. Migrate your photos out of the old R2 bucket: download them from the Cloudflare
   dashboard, then upload through `/admin` into the right categories
5. Delete the two `Sample …` categories from `/admin`
6. Once everything looks good, the R2 bucket and its API tokens can be deleted

## Local development

```bash
npm install
npm run dev        # builds into dist/ and serves it locally
```

`node scripts/make-samples.js` regenerates the placeholder sample photos.

## Repo layout

```
photos/                   the photo library, flat (source of truth for files)
gallery.json              categories + which categories each photo is tagged with
site.config.json          all site text & settings (edited by /admin)
admin/                    the private management UI (static, token-based)
scripts/build.js          static site generator (sharp + exifr)
scripts/optimize-photos.js  CI-side original compression
site/                     CSS/JS assets for the public site
.github/workflows/deploy.yml  build + deploy pipeline
```
