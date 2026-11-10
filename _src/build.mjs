// Builds the static site at the repo root from _src/. Run: cd _src && npm ci && node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildDrawing } from './tools/drawing.mjs';
import { glyphs } from './tools/hershey.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = (p) => path.join(here, 'src', p);
const out = (p) => path.join(root, p);
for (const d of ['assets/js', 'assets/css', 'assets/fonts']) fs.mkdirSync(out(d), { recursive: true });

// Hershey Simplex glyphs used by the plotted labels (with the required acknowledgement)
const data = {};
for (const ch of new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /%.,-?\'')) if (glyphs[ch]) data[ch] = [glyphs[ch].d, glyphs[ch].adv];
data['-'] = ['M 160 300 L 470 300', 600];
fs.writeFileSync(src('hershey-data.js'), `// Hershey Sans 1-stroke glyphs (subset).
// The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the
// U. S. National Bureau of Standards. The format of the Font data in this distribution
// was originally created by James Hurt, Cognition, Inc., 900 Technology Park Drive,
// Billerica, MA 01821 (mit-eddie!ci-dandelion!hurt).
export const HERSHEY = ${JSON.stringify(data)};
`);

// the page, with the two drawings inlined
const wide = buildDrawing('wide'), tall = buildDrawing('tall');
const html = fs.readFileSync(src('index.html'), 'utf8')
  .replace('<!--VB_WIDE-->', wide.viewBox).replace('<!--DRAWING_WIDE-->', wide.body)
  .replace('<!--VB_TALL-->', tall.viewBox).replace('<!--DRAWING_TALL-->', tall.body)
  .replace('assets/js/app.js', 'assets/js/main.js');
fs.writeFileSync(out('index.html'), html);

// scripts (the 3D loads as its own chunk) and styles
for (const f of fs.readdirSync(out('assets/js'))) fs.rmSync(out('assets/js/' + f));
const esbuild = path.join(here, 'node_modules/.bin/esbuild');
execFileSync(esbuild, [src('main.js'), '--bundle', '--splitting', '--format=esm', '--minify', '--target=es2020', `--outdir=${out('assets/js')}`, '--chunk-names=[name]-[hash]', '--legal-comments=eof', '--log-level=warning'], { stdio: 'inherit' });
execFileSync(esbuild, [src('site.css'), '--minify', `--outfile=${out('assets/css/site.css')}`, '--log-level=warning'], { stdio: 'inherit' });

// fonts
const fsrc = path.join(here, 'node_modules/@fontsource-variable');
fs.copyFileSync(path.join(fsrc, 'mona-sans/files/mona-sans-latin-standard-normal.woff2'), out('assets/fonts/mona-sans.woff2'));
fs.copyFileSync(path.join(fsrc, 'hubot-sans/files/hubot-sans-latin-standard-normal.woff2'), out('assets/fonts/hubot-sans.woff2'));
fs.copyFileSync(path.join(fsrc, 'martian-mono/files/martian-mono-latin-standard-normal.woff2'), out('assets/fonts/martian-mono.woff2'));
console.log('built', fs.readdirSync(out('assets/js')).join(', '));
