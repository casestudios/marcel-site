# Deploying marcelcnc.com

This site is a **static export** (`output: "export"` in `next.config.mjs`). The
build produces a plain `./out` folder of HTML/CSS/JS — no server, no environment
variables, no secrets. It can go on any static host.

> These are instructions. Nothing here deploys automatically — you run it.

## 0. Pre-flight checklist

- [ ] Set your contact email and (optional) LinkedIn in `src/lib/site.ts`.
      Default is `hello@marcelcnc.com` — make sure that inbox exists/forwards.
- [ ] `npm run build` succeeds locally.
- [ ] Confirm the social card looks right: `public/og.png`.
- [ ] (If publishing the repo) clean the git history first — see §4.

## 1. Build & preview locally

```bash
npm install
npm run build
npx serve out          # open the printed URL to preview the production build
```

## 2. Deploy — Option A: Vercel (recommended)

Easiest path with a custom domain and automatic rebuilds on push.

```bash
npm i -g vercel        # if not installed
vercel login
vercel --prod          # from the marcel-site/ directory
```

Vercel auto-detects Next.js and the static export. Then add the domain:

1. Vercel dashboard → your project → **Settings → Domains** → add
   `marcelcnc.com` and `www.marcelcnc.com`.
2. At your domain registrar, point DNS at Vercel:
   - `A`   `@`   → `76.76.21.21`
   - `CNAME` `www` → `cname.vercel-dns.com`
   (Vercel shows the exact records to use; follow those.)
3. Wait for DNS + automatic HTTPS to provision.

## 2. Deploy — Option B: Cloudflare Pages / Netlify / any static host

- Build command: `npm run build`
- Output directory: `out`
- Framework preset: Next.js (static export) — or "None", it's just static files.
- Add the custom domain `marcelcnc.com` in the host's dashboard and follow its
  DNS instructions.

Or drag-and-drop the `./out` folder into Netlify Drop for a one-off deploy.

## 3. Deploy — Option C: GitHub Pages

```bash
npm run build
npx gh-pages -d out          # or push ./out to a gh-pages branch
```

Then set the custom domain in the repo's **Pages** settings (adds a `CNAME`).

## 4. Keep the repository private

The plan is to link this site from LinkedIn and **not** publish the source. That
needs no special step — just keep the repo private. Vercel, Netlify, and
Cloudflare Pages all build and deploy from a **private** repo (or a direct
upload), so nothing about the code is exposed to visitors. The deployed site is
static HTML/CSS/JS with no comments or source maps that reveal anything you
wouldn't want public.

If you ever change your mind and want to open-source it, clean the history first
— this repo's earlier commits contain the old marketing-site content (placeholder
testimonials, a vendor-logo carousel). Reset to a single clean commit:

```bash
# from marcel-site/, with the current tree as you want it to ship:
rm -rf .git && git init && git add -A
git commit -m "Marcel — public case study site"
```
