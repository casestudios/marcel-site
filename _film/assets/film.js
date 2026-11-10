// The November 2 run, told on one tool: a 14 s teaser drawn from the site's own 3D scene.
// HyperFrames contract: setup is one buildReady promise, every frame is drawn from the seek
// time alone inside an hf-seek listener, overlays are one paused GSAP timeline.
import * as THREE from './vendor/three.module.js';
import { createTool3D } from './tool3d.js';
import { HERSHEY } from './hershey-data.js';

const W = 1920, H = 1080;
const READY_KEY = 'marcel-tool';
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const range = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const HOLD = 5.0;

function stateAt(t) {
  const sm = (a, b) => smooth(range(t, a, b));
  return {
    t, spin: 0.55 * (1 - sm(9.0, 9.8)), holdAt: t >= HOLD ? HOLD : null, emit: 1,
    lift: sm(9.0, 10.4), turn: sm(9.2, 11.0), explode: sm(9.6, 11.4), cam: sm(9.1, 11.2),
    envYaw: -0.25 + 0.6 * sm(11.0, 20.5), parallaxX: 0, parallaxY: 0,
    framing: 'wide', shiftX: lerp(-0.22, -0.3, sm(9.1, 11.2)), shiftY: 0,
    camAPos: [-118, 44, 178], camALook: [4, 17, 0], fov: 18, fitAspect: 0.7, fitMargin: 1.0,
  };
}

function hersheyPath(str, size, x, y) {
  const s = size / 500, track = 0.1 * size;
  let adv = 0, d = '';
  for (const ch of str) {
    const g = HERSHEY[ch] || HERSHEY['?'];
    if (g[0]) d += g[0].replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/g, (_, c, a, b) => `${c}${(x + adv + a * s).toFixed(1)} ${(y - b * s).toFixed(1)}`);
    adv += g[1] * s + track;
  }
  return { d, width: adv - track };
}

const canvas = document.getElementById('gl');
const marks = document.getElementById('marks');
let tool = null, shown = null;
const pixel = new Uint8Array(4);
function waitForGpu() {
  const gl = tool.renderer.getContext();
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
}

function addCallout(tl, { anchor, at, off, lines, tIn, tOut }) {
  tool.update(stateAt(at));
  const a = tool.project(anchor, W, H);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('opacity', '0');
  // measure the block, then keep it inside the 90% action-safe area
  const measured = lines.map(([text, size]) => hersheyPath(text, size, 0, 0).width);
  const maxW = Math.max(...measured);
  let blockH = 0;
  lines.forEach(([, size], i) => { blockH += size * 1.32 + (i ? 16 : 0); });
  let lx = a.x + off[0], ly = a.y + off[1];
  lx = Math.max(W * 0.05, Math.min(W * 0.95 - maxW, lx));
  ly = Math.max(H * 0.05 + lines[0][1] * 1.32, Math.min(H * 0.95 - blockH, ly));
  let y = 0;
  const paths = [];
  lines.forEach(([text, size, cls], i) => {
    if (i) y += size * 1.32 + 16;
    const { d } = hersheyPath(text, size, lx, ly + y);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d); p.setAttribute('class', cls);
    paths.push(p);
  });
  const shoulder = ly + y + 16;                 // a rule under the last line, like a drawing callout
  const near = a.x < lx ? lx - 14 : lx + maxW + 14;
  const lead = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  lead.setAttribute('class', 'lead');
  lead.setAttribute('d', a.x < lx
    ? `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${near.toFixed(1)} ${shoulder.toFixed(1)}L${(lx + maxW).toFixed(1)} ${shoulder.toFixed(1)}`
    : `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${near.toFixed(1)} ${shoulder.toFixed(1)}L${lx.toFixed(1)} ${shoulder.toFixed(1)}`);
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('cx', a.x.toFixed(1)); dot.setAttribute('cy', a.y.toFixed(1)); dot.setAttribute('r', '4');
  g.append(lead, dot, ...paths);
  marks.appendChild(g);
  const all = [lead, ...paths];
  tl.set(g, { opacity: 1 }, tIn);
  all.forEach((p, i) => {
    const L = p.getTotalLength();
    tl.fromTo(p, { strokeDasharray: `${L} ${L + 20}`, strokeDashoffset: L }, { strokeDashoffset: 0, duration: Math.min(0.9, 0.3 + L / 1800), ease: 'none' }, tIn + (i === 0 ? 0 : 0.22 + (i - 1) * 0.22));
  });
  tl.to(g, { opacity: 0, duration: 0.25, ease: 'power1.in' }, tOut);
}

async function setup() {
  await Promise.all([
    document.fonts.load('600 40px "Hubot Sans"'), document.fonts.load('640 40px "Mona Sans"'), document.fonts.load('400 20px "Martian Mono"'),
  ]);
  tool = createTool3D(THREE, { canvas, quality: 'high', preserveDrawingBuffer: true });
  tool.resize(W, H, 1);

  const tl = gsap.timeline({ paused: true });
  // text cards rise in and leave
  const card = (h, p, tIn, tOut) => {
    tl.fromTo(h, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, tIn);
    if (p) tl.fromTo(p, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, tIn + 0.14);
    tl.to([h, p].filter(Boolean), { opacity: 0, duration: 0.25, ease: 'power1.in' }, tOut);
  };
  card('#c1h', '#c1p', 0.35, 4.6);
  card('#c2h', '#c2p', 5.1, 8.75);
  card('#c3h', '#c3p', 9.25, 14.85);
  card('#c4h', null, 15.2, 20.4);
  tl.fromTo('#c4m', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, 15.25);
  tl.to('#c4m', { opacity: 0, duration: 0.25 }, 20.4);
  tl.fromTo('#dim', { opacity: 0 }, { opacity: 0.62, duration: 0.6, ease: 'power2.out' }, 15.0);
  // the HUD: load climbs to 93%, then feed hold
  const loadEl = document.getElementById('load'), bar = document.getElementById('bar'), feed = document.getElementById('feed');
  const lrun = document.getElementById('lrun'), lhold = document.getElementById('lhold');
  const hudState = { v: 72 };
  const paintHud = () => {
    loadEl.textContent = String(Math.round(hudState.v));
    bar.style.width = `${(hudState.v / 130) * 100}%`;
    bar.style.background = hudState.v > 84 ? '#e3b768' : '#c9c8c3';
  };
  tl.fromTo(hudState, { v: 72 }, { v: 93, duration: 4.4, ease: 'none', onUpdate: paintHud }, 0.6);
  tl.fromTo('#hud', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.1);
  tl.set(lrun, { color: '#0a0a0b', backgroundColor: '#8fd19e', borderColor: '#8fd19e' }, 0);
  tl.set(lrun, { color: '#6a6a70', backgroundColor: 'transparent', borderColor: '#3a3a40' }, HOLD);
  tl.set(lhold, { color: '#0a0a0b', backgroundColor: '#e3b768', borderColor: '#e3b768' }, HOLD);
  tl.set(feed, { textContent: '80.0 IN/MIN' }, 0);
  tl.set(feed, { textContent: '0.0 IN/MIN' }, HOLD);
  tl.to('#hud', { opacity: 0, duration: 0.3 }, 8.7);
  // plotted marks on the tool
  addCallout(tl, { anchor: 'endmill', at: 1, off: [-560, -150], lines: [['T02', 44, 'let'], ['1/2 IN 3-FLUTE ROUGHER', 22, 'let']], tIn: 0.8, tOut: 4.6 });
  addCallout(tl, { anchor: 'edge', at: 6, off: [-560, -130], lines: [['FEED HOLD', 44, 'let straw'], ['93%   SPINDLE TURNING', 22, 'let']], tIn: 5.1, tOut: 8.75 });
  addCallout(tl, { anchor: 'endmill', at: 12, off: [-260, 150], lines: [['1  CHIPS PACKED OR LOW COOLANT', 22, 'let']], tIn: 11.5, tOut: 14.85 });
  addCallout(tl, { anchor: 'collet', at: 12, off: [-520, -200], lines: [['2  WRONG TYPE, OR NOT SEATED', 22, 'let']], tIn: 11.8, tOut: 14.85 });
  addCallout(tl, { anchor: 'holder', at: 12, off: [-380, 200], lines: [['3  COUNTER SHOWS 37 LEFT, NOT 300', 22, 'let']], tIn: 12.1, tOut: 14.85 });
  // dim the tool under the message, then the end card
  tl.fromTo('#shade', { opacity: 1 }, { opacity: 1, duration: 0.01 }, 0);
  tl.fromTo('#end', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 20.6);
  tl.fromTo('#endmark', { opacity: 0, y: 24, letterSpacing: '0.34em' }, { opacity: 1, y: 0, letterSpacing: '0.24em', duration: 0.9, ease: 'expo.out' }, 20.75);
  tl.fromTo('#endline', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, 20.95);
  tl.fromTo('#temper', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'expo.out' }, 21.1);
  tl.fromTo('#endurl', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 21.3);

  // warm up: compile and draw one throwaway frame
  tool.update(stateAt(0));
  await tool.compile();
  tool.render(); waitForGpu();
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = tl;
}

function draw(time) {
  if (time === shown) return;
  tool.update(stateAt(time));
  tool.render();
  waitForGpu();
  shown = time;
}

const ready = setup();
ready.catch((e) => console.error('setup failed:', e && e.stack ? e.stack : e));
window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady[READY_KEY] = ready;
let queue = ready;
window.addEventListener('hf-seek', (event) => {
  const { time } = event.detail;
  queue = queue.catch(() => {}).then(() => ready).then(() => draw(time));
  event.detail.waitUntil(queue);
});
