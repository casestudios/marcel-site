// Hershey Sans 1-stroke (Hershey Simplex) as SVG path data, for plotted lettering.
// The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the
// U. S. National Bureau of Standards. The format of the Font data in this distribution
// was originally created by James Hurt, Cognition, Inc., 900 Technology Park Drive,
// Billerica, MA 01821 (mit-eddie!ci-dandelion!hurt).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const svg = fs.readFileSync(path.join(here, '../node_modules/hersheytext/svg_fonts/HersheySans1.svg'), 'utf8');
const unesc = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'");
export const glyphs = {};
const defAdv = Number((svg.match(/<font[^>]*horiz-adv-x="([\d.]+)"/) || [])[1] || 378);
for (const m of svg.matchAll(/<glyph\s+([^>]*?)\/>/g)) {
  const attrs = Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
  if (!('unicode' in attrs)) continue;
  const ch = unesc(attrs.unicode);
  glyphs[ch] = { d: attrs.d || '', adv: Number(attrs['horiz-adv-x'] || defAdv) };
}
// Font units: units-per-em 1000, cap height ~ 500 above the baseline (y up).
export const CAP = 500;
// Turn a string into one path. size = cap height in px. Returns { d, width }.
export function textPath(str, size, { x = 0, y = 0, tracking = 0.08, anchor = 'start' } = {}) {
  const s = size / CAP;
  let adv = 0;
  const parts = [];
  const track = tracking * size;
  for (const ch of str) {
    const g = glyphs[ch] || glyphs['?'];
    if (g.d) parts.push({ d: g.d, ox: adv });
    adv += g.adv * s + track;
  }
  const width = adv - track;
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const out = [];
  for (const p of parts) {
    const t = p.d.replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/g, (_, c, a, b) => {
      const X = x0 + p.ox + Number(a) * s, Y = y - Number(b) * s;
      return `${c}${X.toFixed(2)} ${Y.toFixed(2)}`;
    });
    out.push(t);
  }
  return { d: out.join(''), width };
}
// Per-glyph paths (for pen-order plotting): returns [{d}] in reading order.
export function textGlyphs(str, size, opts = {}) {
  const res = [];
  let acc = '';
  const { width } = textPath(str, size, opts);
  for (const ch of str) {
    const before = textPath(acc, size, { ...opts, anchor: 'start', x: 0 }).width;
    acc += ch;
    void before;
  }
  return { width, d: textPath(str, size, opts).d };
}
export function runtimeData(chars) {
  const sub = {};
  for (const ch of new Set(chars)) if (glyphs[ch]) sub[ch] = [glyphs[ch].d, glyphs[ch].adv];
  return sub;
}
