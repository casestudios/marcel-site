// Build the claude.ai preview of site v5: body only, JS and CSS inlined, fonts as data URIs,
// media as supporting files beside the page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'preview');
fs.mkdirSync(path.join(out, 'media'), { recursive: true });
const esb = path.join(root, 'node_modules/.bin/esbuild');
// one IIFE bundle, the 3D included
const js = execFileSync(esb, [path.join(root, 'src/main.js'), '--bundle', '--format=iife', '--minify', '--target=es2020', '--legal-comments=none', '--log-level=warning'], { maxBuffer: 64 << 20 }).toString();
// CSS with fonts embedded
let css = fs.readFileSync(path.join(root, 'src/site.css'), 'utf8');
for (const f of ['mona-sans', 'hubot-sans', 'martian-mono']) {
  const b64 = fs.readFileSync(path.join(root, 'site/assets/fonts', f + '.woff2')).toString('base64');
  css = css.replace(`url(../fonts/${f}.woff2)`, `url(data:font/woff2;base64,${b64})`);
}
fs.writeFileSync(path.join(out, 'tmp.css'), css);
css = execFileSync(esb, [path.join(out, 'tmp.css'), '--minify', '--log-level=warning']).toString();
fs.rmSync(path.join(out, 'tmp.css'));
// body from the built site
const html = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
let body = html.split(/<body[^>]*>/)[1].split('</body>')[0];
body = body.replace(/<script type="module" src="assets\/js\/main\.js"><\/script>/, '');
const page = `<title>Marcel Site v5</title>
<meta name="description" content="marcelcnc.com v5 preview">
<script>document.documentElement.classList.add('js');</script>
<style>${css}</style>
${body.trim()}
<script>${js}</script>
`;
fs.writeFileSync(path.join(out, 'marcel-site-v5.html'), page);
// media actually referenced by the page
const refs = new Set([...page.matchAll(/media\/[\w.-]+/g)].map((m) => m[0]).filter((r) => !r.endsWith('.')));
for (const r of refs) {
  const src = path.join(root, 'site', r);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, r)); else console.log('missing', r);
}
// local harness with the host's skeleton
const skeleton = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
fs.writeFileSync(path.join(out, 'index.html'), skeleton + page + '</body></html>');
let total = Buffer.byteLength(page);
for (const r of refs) total += fs.statSync(path.join(out, r)).size;
console.log('page', (Buffer.byteLength(page) / 1024).toFixed(0) + 'KB', 'media', refs.size, 'files, total', (total / 1048576).toFixed(1) + 'MB');
console.log([...refs].join(' '));
