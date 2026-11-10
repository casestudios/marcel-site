// marcelcnc.com v5
import Lenis from 'lenis';
import { HERSHEY } from './hershey-data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const range = (u, a, b) => clamp01((u - a) / (b - a));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const SVGNS = 'http://www.w3.org/2000/svg';

/* ---------------- smooth scroll (desktop pointers only) ---------------- */
let lenis = null;
if (!reduce && !coarse) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9, anchors: { offset: -72 } });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

/* ---------------- header ---------------- */
{
  const bar = $('#top-bar');
  const onScroll = () => bar.classList.toggle('is-solid', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const btn = $('.menu-btn'), sheet = $('#menu-sheet');
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    sheet.hidden = !open;
    bar.classList.toggle('is-solid', open || scrollY > 8);
  });
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) { btn.setAttribute('aria-expanded', 'false'); sheet.hidden = true; } });
}

/* ---------------- plotted lettering (Hershey Simplex) ---------------- */
function hersheyPath(str, size, x, y, anchor = 'start', tracking = 0.1) {
  const s = size / 500, track = tracking * size;
  let adv = 0; const parts = [];
  for (const ch of str) {
    const g = HERSHEY[ch] || HERSHEY['?'];
    if (g[0]) parts.push([g[0], adv]);
    adv += g[1] * s + track;
  }
  const width = adv - track;
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  let d = '';
  for (const [gd, ox] of parts) {
    d += gd.replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/g, (_, c, a, b) => `${c}${(x0 + ox + a * s).toFixed(1)} ${(y - b * s).toFixed(1)}`);
  }
  return { d, width };
}

/* ---------------- hero entrance ---------------- */
if (!reduce) {
  const els = $$('.hero-copy > *');
  els.forEach((el, i) => el.animate(
    [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
    { duration: 1100, delay: 120 + i * 110, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' },
  ));
}

/* ======================= THE STAGE ======================= */
const stage = $('.stage');
const steps = $('.stage-steps');
const hud = $('.hud');
const H = {
  load: $('[data-hud="load"]'), bar: $('[data-hud="bar"]'), feed: $('[data-hud="feed"]'), block: $('[data-hud="block"]'),
  run: $('[data-lamp="run"]'), hold: $('[data-lamp="hold"]'),
};
const shade = $('.shade');
const posterB = $('.stage-poster-b');
const calloutSvg = $('.callouts');
const phone = $('.phone');
const replyBtn = $('.btn-reply');

let vh = innerHeight, stageTop = 0, stageH = 0;
function measure() {
  vh = innerHeight;
  const r = stage.getBoundingClientRect();
  stageTop = r.top + scrollY; stageH = r.height;
}
measure();
addEventListener('resize', () => { measure(); }, { passive: true });

const stageU = () => (scrollY - stageTop) / vh;   // 0 at the hero, +1 per screen

// story values from the scroll position (shared by the 3D and the HUD)
function story(u) {
  const climb = range(u, 0.45, 1.55);
  const held = u >= 1.55;
  return {
    load: held ? 93 : lerp(72, 93, climb),
    held,
    lift: range(u, 2.2, 2.75),
    turn: range(u, 2.3, 2.95),
    explode: range(u, 2.45, 3.0),
    cam: range(u, 2.25, 2.95),
    spin: 0.55 * (1 - range(u, 2.15, 2.6)),
    dim: range(u, 3.45, 3.9) * 0.8,
    hudOut: range(u, 2.15, 2.45),
  };
}

// resume after the reply: blends the scene back to cutting
let resume = 0, resumeTarget = 0;
let replied = false;

function setHud(sv) {
  const r = smooth(resume);
  const load = Math.round(lerp(sv.load, 39, r));
  H.load.textContent = String(load);
  H.bar.style.width = `${Math.min(100, (load / 130) * 100)}%`;
  hud.classList.toggle('hot', load > 84 && r < 0.5);
  const heldNow = sv.held && r < 0.5;
  H.feed.textContent = heldNow ? '0.0 IN/MIN' : '80.0 IN/MIN';
  H.block.textContent = r > 0.5 ? 'N330' : sv.load > 72.5 || sv.held ? 'N270' : 'N250';
  H.run.classList.toggle('on', !heldNow);
  H.hold.classList.toggle('on', heldNow);
  hud.style.opacity = String(Math.max(1 - sv.hudOut, r));
}

/* ---------- reduced motion / no WebGL: posters only ---------- */
function posterMode() {
  const tick = () => {
    const u = stageU();
    const sv = story(u);
    posterB.style.opacity = sv.explode > 0.5 ? '1' : '0';
    shade.style.setProperty('--dim', String(sv.dim));
    setHud(sv);
  };
  addEventListener('scroll', tick, { passive: true });
  tick();
}

/* ---------- phone ---------- */
function resetPhone() {
  replied = false; resumeTarget = 0;
  phone.classList.remove('replied');
  $$('.thread .you, .thread [data-late]').forEach((li) => { li.hidden = true; });
}
replyBtn.addEventListener('click', () => {
  if (replied) return;
  replied = true;
  phone.classList.add('replied');
  const you = $('.thread .you'), late = $('.thread [data-late]');
  you.hidden = false;
  const thread = $('.thread');
  thread.scrollTo({ top: thread.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  setTimeout(() => {
    late.hidden = false;
    thread.scrollTo({ top: thread.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    resumeTarget = 1;
    if (reduce) resume = 1;
  }, reduce ? 0 : 900);
});

/* ---------- WebGL ---------- */
async function startGL() {
  const canvas = $('.stage-canvas');
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) return false;
  const THREE = await import('three');
  const { createTool3D } = await import('../shared/tool3d.js');
  await document.fonts.load('600 40px "Hubot Sans"').catch(() => {});
  const quality = coarse || Math.min(screen.width, screen.height) < 700 ? 'low' : 'high';
  let tool;
  try { tool = createTool3D(THREE, { canvas, quality }); } catch (e) { console.warn(e); return false; }

  let W = 0, Hh = 0, tall = false;
  function size() {
    W = canvas.clientWidth; Hh = canvas.clientHeight;
    tall = W / Hh < 0.8;
    const dpr = Math.min(devicePixelRatio || 1, quality === 'low' ? 1.5 : 1.75);
    tool.resize(W, Hh, dpr);
    calloutSvg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
    dirty = true;
  }
  let dirty = true;
  size();
  addEventListener('resize', size, { passive: true });

  // pointer: the key light follows the hand, like turning a part under a lamp
  let px = 0, py = 0, tx = 0, ty = 0;
  if (!coarse) addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  // callouts
  const callouts = buildCallouts();

  let t = 0, last = performance.now(), holdAt = null, visible = true, running = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe($('.stage-pin'));

  function frame(now) {
    running = false;
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const u = stageU();
    const sv = story(u);
    // the reply resumes the cut; scrolling back before the hold resets the story
    if (u < 1.4 && replied) resetPhone();
    resume += (resumeTarget - resume) * Math.min(1, dt * 1.6);
    if (Math.abs(resumeTarget - resume) < 0.001) resume = resumeTarget;
    const r = smooth(resume);

    const heldNow = sv.held && r < 0.5;
    if (heldNow && holdAt === null) holdAt = t;
    if (!heldNow) holdAt = null;
    const spin = lerp(sv.spin, 0.55, r);
    t += dt;
    px += (tx - px) * Math.min(1, dt * 3); py += (ty - py) * Math.min(1, dt * 3);
    tool.update({
      t, spin,
      holdAt,
      emit: 1,
      lift: lerp(sv.lift, 0, r), turn: lerp(sv.turn, 0, r), explode: lerp(sv.explode, 0, r), cam: lerp(sv.cam, 0, r),
      envYaw: px * 0.9, parallaxX: px * 0.6, parallaxY: -py * 0.4,
      framing: tall ? 'tall' : 'wide',
      shiftX: tall ? 0 : lerp(-0.3, -0.34, smooth(lerp(sv.cam, 0, r))),
      shiftY: tall ? lerp(0.16, 0.25, smooth(lerp(sv.cam, 0, r))) : 0,
      fitAspect: tall ? 1 : 0.66,
      fitHeight: tall ? 0.46 : 1,
      fitMargin: tall ? 1.04 : 0.98,
      camAPos: tall ? [-80, 52, 360] : [-118, 44, 178],
      camALook: tall ? [2, 12, 0] : [4, 17, 0],
      fov: tall ? 22 : 18,
    });
    tool.render();
    shade.style.setProperty('--dim', String(lerp(sv.dim, 0.35, r)));
    setHud(sv);
    callouts.update(u, sv, r, tool, W, Hh);
    if (!stage.classList.contains('gl-on')) stage.classList.add('gl-on');
    // keep animating while anything moves on its own
    const live = spin > 0.001 || (holdAt === null && sv.lift < 0.6) || Math.abs(resumeTarget - resume) > 0 || Math.abs(tx - px) > 0.0005 || dirty;
    dirty = false;
    if (live) kick();
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('pointermove', kick, { passive: true });
  replyBtn.addEventListener('click', kick);
  await tool.compile();
  kick();
  return true;
}

/* ---------- callouts on the 3D, plotted as they appear ---------- */
function buildCallouts() {
  const svg = calloutSvg;
  const groups = [];
  // anchor: named point on the tool; side: where the label sits; lines: [text, size, cls]
  const defs = [
    { id: 'tool', anchor: 'endmill', wideOnly: true, show: (u, r) => u < 1.35 && r < 0.5, off: [-320, -250], offTall: [-150, -190], lines: [['T02', 22, 'let'], ['1/2 IN 3-FLUTE ROUGHER', 10, 'let']] },
    { id: 'hold', anchor: 'edge', show: (u, r) => u >= 1.55 && u < 2.2 && r < 0.5, off: [-310, -150], offTall: [-150, -200], lines: [['FEED HOLD', 22, 'let let-straw'], ['93%   SPINDLE TURNING', 10, 'let']] },
    { id: 'c1', wideOnly: true, anchor: 'endmill', show: (u, r) => u >= 2.98 && u < 3.75 && r < 0.5, off: [-60, 110], offTall: [-20, 90], lines: [['1  CHIPS PACKED OR LOW COOLANT', 10.5, 'let']] },
    { id: 'c2', wideOnly: true, anchor: 'collet', show: (u, r) => u >= 3.06 && u < 3.75 && r < 0.5, off: [-120, -160], offTall: [-60, -110], lines: [['2  WRONG TYPE, OR NOT SEATED', 10.5, 'let']] },
    { id: 'c3', wideOnly: true, anchor: 'holder', show: (u, r) => u >= 3.14 && u < 3.75 && r < 0.5, off: [10, 150], offTall: [-120, 120], lines: [['3  COUNTER SHOWS 37 LEFT, NOT 300', 10.5, 'let']] },
  ];
  for (const d of defs) {
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'co');
    g.style.opacity = '0';
    const lead = document.createElementNS(SVGNS, 'path'); lead.setAttribute('class', 'lead');
    const dot = document.createElementNS(SVGNS, 'circle'); dot.setAttribute('class', 'dot'); dot.setAttribute('r', '2.6');
    const ring = document.createElementNS(SVGNS, 'circle'); ring.setAttribute('class', 'ring'); ring.setAttribute('r', '7');
    const txt = document.createElementNS(SVGNS, 'g');
    let y = 0, maxW = 0;
    const paths = [];
    for (const [s, size, cls] of d.lines) {
      const { d: pd, width } = hersheyPath(s, size, 0, y, 'start');
      const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', pd); p.setAttribute('class', cls);
      txt.appendChild(p); paths.push(p);
      maxW = Math.max(maxW, width); y += size + 12;
    }
    g.append(lead, ring, dot, txt);
    svg.appendChild(g);
    groups.push({ ...d, g, lead, dot, ring, txt, paths, maxW, h: y, on: false, lens: null });
  }
  function plot(gr, on) {
    gr.lens = [gr.lead, ...gr.paths].map((p) => { try { return p.getTotalLength() || 300; } catch { return 300; } });
    const all = [gr.lead, ...gr.paths];
    all.forEach((p, i) => {
      const L = gr.lens[i];
      p.style.strokeDasharray = `${L} ${L + 10}`;
      if (on && !reduce) {
        p.style.transition = 'none';
        p.style.strokeDashoffset = String(L);
        p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset ${Math.min(1.1, 0.25 + L / 900)}s linear ${i === 0 ? 0 : 0.25 + (i - 1) * 0.25}s`;
        p.style.strokeDashoffset = '0';
      } else {
        p.style.strokeDashoffset = '0';
      }
    });
    gr.g.style.transition = on ? 'opacity 120ms linear' : 'opacity 260ms linear';
    gr.g.style.opacity = on ? '1' : '0';
  }
  return {
    update(u, sv, r, tool, W, Hh) {
      const k = Math.min(1, W / 1280);
      const small = W < 700;
      for (const gr of groups) {
        const want = gr.show(u, r) && !(small && gr.wideOnly);
        if (!want && !gr.on) continue;
        const a = tool.project(gr.anchor, W, Hh);
        const off = W < 700 && gr.offTall ? gr.offTall : gr.off;
        let ox = off[0] * Math.max(0.55, k), oy = off[1] * Math.max(0.6, k);
        // keep labels on screen
        let lx = a.x + ox, ly = a.y + oy;
        lx = Math.max(16, Math.min(W - gr.maxW - 16, lx));
        ly = Math.max(84, Math.min(Hh - gr.h - 24, ly));
        const shoulderY = ly + 8;
        const sx = lx - 10;
        gr.lead.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${sx.toFixed(1)} ${shoulderY.toFixed(1)}L${(lx + gr.maxW).toFixed(1)} ${shoulderY.toFixed(1)}`);
        gr.dot.setAttribute('cx', a.x.toFixed(1)); gr.dot.setAttribute('cy', a.y.toFixed(1));
        gr.ring.setAttribute('cx', a.x.toFixed(1)); gr.ring.setAttribute('cy', a.y.toFixed(1));
        gr.txt.setAttribute('transform', `translate(${lx.toFixed(1)} ${(ly - 2).toFixed(1)})${small ? ' scale(0.72)' : ''}`);
        if (want !== gr.on) { gr.on = want; plot(gr, want); }
      }
    },
  };
}

(async () => {
  let ok = false;
  if (!reduce) { try { ok = await startGL(); } catch (e) { console.warn('3D off:', e); ok = false; } }
  if (!ok) posterMode();
})();

/* ======================= THE DRAWING ======================= */
{
  const fig = $('.drawing');
  if (fig) {
    if (reduce) fig.classList.add('plotted');
    else {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        fig.classList.add('plotting');
        setTimeout(() => { fig.classList.add('plotted'); fig.classList.remove('plotting'); }, 3600);
      }, { threshold: 0.22 });
      io.observe(fig);
    }
    // parts list and drawing point at each other
    const rows = $$('.bom tbody tr');
    const items = $$('.dw .item');
    const focus = (n) => {
      fig.classList.toggle('focus', !!n);
      items.forEach((g) => g.classList.toggle('on', g.dataset.item === n));
      rows.forEach((r) => r.classList.toggle('on', r.dataset.item === n));
    };
    rows.forEach((r) => { r.addEventListener('pointerenter', () => focus(r.dataset.item)); r.addEventListener('pointerleave', () => focus(null)); });
    items.forEach((g) => { g.addEventListener('pointerenter', () => focus(g.dataset.item)); g.addEventListener('pointerleave', () => focus(null)); });
  }
}

/* ======================= INSPECTION REPORT ======================= */
{
  const report = $('.ins');
  const counts = $$('.num[data-count]');
  const pages = $('.viz-pages');
  const answers = $('.viz-answers');
  // 16 answers: sixteen marks, none of them red
  if (answers) {
    for (let i = 0; i < 16; i++) {
      const r = document.createElementNS(SVGNS, 'rect');
      r.setAttribute('x', String(i * 15)); r.setAttribute('y', '6'); r.setAttribute('width', '11'); r.setAttribute('height', '12');
      r.setAttribute('fill', '#c9c8c3');
      answers.appendChild(r);
    }
  }
  function drawPages(p) {
    if (!pages) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = pages.clientWidth || 240, h = 24;
    if (pages.width !== Math.round(w * dpr)) { pages.width = Math.round(w * dpr); pages.height = h * dpr; }
    const c = pages.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const cols = 175, rows = 12, n = 2100;
    const sx = w / cols, sy = h / rows;
    const lit = Math.round(n * p);
    for (let i = 0; i < n; i++) {
      const col = Math.floor(i / rows), row = i % rows;
      c.fillStyle = i < lit ? '#c9c8c3' : '#26262a';
      c.fillRect(col * sx, row * sy, Math.max(0.8, sx * 0.62), Math.max(0.8, sy * 0.62));
    }
  }
  drawPages(reduce ? 1 : 0);
  if (report) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (reduce) { drawPages(1); return; }
      const t0 = performance.now();
      const fmt = (n) => n.toLocaleString('en-US');
      const tick = (now) => {
        const k = clamp01((now - t0) / 1400);
        const e2 = 1 - Math.pow(1 - k, 4);
        counts.forEach((el) => {
          const to = Number(el.dataset.count);
          el.textContent = fmt(Math.round(to * e2)) + (el.hasAttribute('data-plus') && k >= 1 ? '+' : '');
        });
        drawPages(e2);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    io.observe(report);
  }
}

/* ======================= RECORDINGS ======================= */
{
  const tabs = $$('.reel-tabs [role="tab"]');
  const show = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      const v = panel.querySelector('video');
      if (!on && v && !v.paused) v.pause();
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        show(n, true);
      }
    });
  });
  $$('.reel video').forEach((v) => {
    const load = () => { if (!v.src && v.dataset.src) { v.src = v.dataset.src; } };
    v.addEventListener('pointerenter', load, { once: true });
    v.addEventListener('focus', load, { once: true });
    v.addEventListener('play', () => v.classList.add('playing'));
    v.addEventListener('pause', () => v.classList.remove('playing'));
    v.addEventListener('click', load);
    // a click on the poster before the source is set
    v.addEventListener('pointerdown', () => { if (!v.src) { load(); v.play().catch(() => {}); } });
  });
}

/* ======================= FILM ======================= */
{
  const video = $('.film-video');
  const beats = $$('.beats button');
  beats.forEach((b) => b.addEventListener('click', () => {
    video.currentTime = Number(b.dataset.t) + 0.05;
    video.play().catch(() => {});
  }));
  video.addEventListener('timeupdate', () => {
    const t = video.currentTime;
    let on = 0;
    beats.forEach((b, i) => { if (t >= Number(b.dataset.t)) on = i; });
    beats.forEach((b, i) => b.classList.toggle('on', i === on && t > 0));
  });
}

/* ======================= COST ======================= */
{
  const form = $('.calc');
  const out = (k) => $(`[data-out="${k}"]`);
  const grid = $('.nights-grid');
  // a fixed shuffle of the 365 nights, so adding stops only adds red squares
  const order = Array.from({ length: 365 }, (_, i) => i);
  let a = 20261109 >>> 0;
  const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const rankOf = new Array(365); order.forEach((n, r) => { rankOf[n] = r; });
  const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
  function drawNights(red) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = grid.clientWidth || 600;
    const cols = 53, rows = 7, gap = Math.max(1.5, w / cols * 0.18);
    const cell = (w - gap * (cols - 1)) / cols;
    const h = rows * cell + (rows - 1) * gap;
    grid.width = Math.round(w * dpr); grid.height = Math.round(h * dpr);
    grid.style.height = `${h}px`;
    const c = grid.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < 365; i++) {
      const col = Math.floor(i / rows), row = i % rows;
      c.fillStyle = rankOf[i] < red ? '#ff5a45' : '#232327';
      c.fillRect(col * (cell + gap), row * (cell + gap), cell, cell);
    }
  }
  function calc() {
    const f = new FormData(form);
    const rate = Number(f.get('rate')), hours = Number(f.get('hours')), stops = Number(f.get('stops'));
    out('rate').textContent = usd(rate);
    out('hours').textContent = `${hours} h`;
    out('stops').textContent = String(stops);
    const month = rate * hours * stops;
    out('month').textContent = usd(month);
    out('year').textContent = usd(month * 12);
    out('nights').textContent = String(Math.min(365, stops * 12));
    out('formula').textContent = `${usd(rate)} × ${hours} h × ${stops} stops`;
    $$('input[type="range"]', form).forEach((r) => {
      const p = ((Number(r.value) - Number(r.min)) / (Number(r.max) - Number(r.min))) * 100;
      r.style.setProperty('--fill', `${p}%`);
    });
    drawNights(Math.min(365, stops * 12));
  }
  form.addEventListener('input', calc);
  addEventListener('resize', calc, { passive: true });
  calc();
}

/* ======================= COPY EMAIL ======================= */
{
  const b = $('.btn-copy');
  if (b) b.addEventListener('click', async () => {
    const label = b.querySelector('.copy-label');
    try { await navigator.clipboard.writeText(b.dataset.copy); label.textContent = 'Copied'; }
    catch { label.textContent = b.dataset.copy; }
    setTimeout(() => { label.textContent = `Copy ${b.dataset.copy}`; }, 1800);
  });
}
