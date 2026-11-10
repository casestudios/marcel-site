// Build site/ from src/: drawings, Hershey data, JS bundle, CSS, fonts, media.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildDrawing } from './drawing.mjs';
import { glyphs } from './hershey.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => path.join(root, 'src', p);
const out = (p) => path.join(root, 'site', p);
const v4 = path.resolve(root, '../site-v2');
fs.mkdirSync(out('assets/js'), { recursive: true });
fs.mkdirSync(out('assets/css'), { recursive: true });
fs.mkdirSync(out('assets/fonts'), { recursive: true });
fs.mkdirSync(out('media'), { recursive: true });

// 1. Hershey runtime data: only the glyphs the callouts use
const chars = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /%.,-?\'+":()#=&°×·');
const data = {};
for (const ch of chars) if (glyphs[ch]) data[ch] = [glyphs[ch].d, glyphs[ch].adv];
data['-'] = ['M 160 300 L 470 300', 600];
fs.writeFileSync(src('hershey-data.js'), `// Hershey Sans 1-stroke glyphs (subset).
// The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the
// U. S. National Bureau of Standards. The format of the Font data in this distribution
// was originally created by James Hurt, Cognition, Inc., 900 Technology Park Drive,
// Billerica, MA 01821 (mit-eddie!ci-dandelion!hurt).
export const HERSHEY = ${JSON.stringify(data)};
`);

// 2. HTML with the drawings inlined
let html = fs.readFileSync(src('index.html'), 'utf8');
const wide = buildDrawing('wide'), tall = buildDrawing('tall');
html = html.replace('<!--VB_WIDE-->', wide.viewBox).replace('<!--DRAWING_WIDE-->', wide.body)
  .replace('<!--VB_TALL-->', tall.viewBox).replace('<!--DRAWING_TALL-->', tall.body);
html = html.replace('assets/js/app.js', 'assets/js/main.js');
fs.writeFileSync(out('index.html'), html);

// 3. JS bundle (the 3D loads as its own chunk)
for (const f of fs.readdirSync(out('assets/js'))) fs.rmSync(out('assets/js/' + f));
execFileSync(path.join(root, 'node_modules/.bin/esbuild'), [
  src('main.js'), '--bundle', '--splitting', '--format=esm', '--minify', '--target=es2020',
  `--outdir=${out('assets/js')}`, '--chunk-names=[name]-[hash]', '--legal-comments=eof', '--log-level=warning',
], { stdio: 'inherit' });

// 4. CSS
execFileSync(path.join(root, 'node_modules/.bin/esbuild'), [src('site.css'), '--minify', `--outfile=${out('assets/css/site.css')}`, '--log-level=warning'], { stdio: 'inherit' });

// 5. fonts
const fsrc = path.join(root, 'node_modules/@fontsource-variable');
fs.copyFileSync(path.join(fsrc, 'mona-sans/files/mona-sans-latin-standard-normal.woff2'), out('assets/fonts/mona-sans.woff2'));
fs.copyFileSync(path.join(fsrc, 'hubot-sans/files/hubot-sans-latin-standard-normal.woff2'), out('assets/fonts/hubot-sans.woff2'));
fs.copyFileSync(path.join(fsrc, 'martian-mono/files/martian-mono-latin-standard-normal.woff2'), out('assets/fonts/martian-mono.woff2'));

// 6. media carried over from v4 (recordings and the film)
for (const f of ['film-1080.mp4', 'film-phone.mp4', 'film-poster.jpg', 'film-poster-phone.jpg', 'today-loop.mp4', 'today-loop.jpg', 'today-watch.mp4', 'today-watch.jpg', 'today-mill.mp4', 'today-mill.jpg']) {
  const to = out('media/' + f);
  if (!fs.existsSync(to)) fs.copyFileSync(path.join(v4, 'media', f), to);
}
// 6b. media rendered for v5 (stage posters, plates)
const v5media = path.join(root, 'media');
if (fs.existsSync(v5media)) for (const f of fs.readdirSync(v5media)) fs.copyFileSync(path.join(v5media, f), out('media/' + f));
// 7. icon, robots, sitemap, vercel config
fs.writeFileSync(out('assets/icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0a0a0b"/><path d="M8 23V9l8 9 8-9v14" fill="none" stroke="#ecebe6" stroke-width="2.6" stroke-linejoin="round"/></svg>`);
for (const f of ['robots.txt', 'sitemap.xml', 'vercel.json']) if (fs.existsSync(path.join(v4, f))) fs.copyFileSync(path.join(v4, f), out(f));
console.log('built site/', fs.readdirSync(out('assets/js')).map((f) => `${f} ${(fs.statSync(out('assets/js/' + f)).size / 1024).toFixed(0)}KB`).join(', '));
