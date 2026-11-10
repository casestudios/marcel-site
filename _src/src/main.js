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
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: { offset: -72 } });
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
    btn.textContent = open ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('menu-open', open);
    sheet.hidden = !open;
    bar.classList.toggle('is-solid', open || scrollY > 8);
  });
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) { btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu'; document.documentElement.classList.remove('menu-open'); sheet.hidden = true; } });
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
const shade = $('.shade');
const fadeEl = $('.fade');
const posters = $$('.stage-poster');
const calloutSvg = $('.callouts');
const phone = $('.phone');
const replyBtn = $('.btn-reply');
const qs = new URLSearchParams(location.search);
const POSTER = qs.has('poster');                       // used to render the reduced-motion stills
const fixedU = qs.has('u') ? Number(qs.get('u')) : null;
if (POSTER) document.documentElement.classList.add('poster-mode');

let vh = innerHeight, stageTop = 0;
// scroll anchors, in screens from the top of the stage; the causes step is taller, so its range is measured
const A = { causes: 4, causesEnd: 5.55, phone: 6.4, c: [4.2, 4.65, 5.1, 5.55] };
function measure() {
  vh = innerHeight;
  stageTop = stage.getBoundingClientRect().top + scrollY;
  const cs = $('.step-causes'), panel = $('.step-causes .panel'), ph = $('.step-phone');
  const top = (el) => el.getBoundingClientRect().top + scrollY - stageTop;
  A.causes = top(cs) / vh;
  const stepEnd = top(cs) + cs.offsetHeight;
  const narrow = matchMedia('(max-width: 860px)').matches;
  const cssTop = parseFloat(getComputedStyle(panel).top) || 0;
  // the panel stays pinned until the step runs out of room under it
  A.causesEnd = narrow ? stepEnd / vh - 1 : (stepEnd - parseFloat(getComputedStyle(cs).paddingBottom) - panel.offsetHeight - cssTop) / vh;
  A.causesEnd = Math.max(A.causesEnd, A.causes + 1.1);
  A.phone = top(ph) / vh;
  const s0 = Math.max(4.15, A.causes + 0.2), span = (A.causesEnd - s0) / 3;
  A.c = [s0, s0 + span, s0 + 2 * span, A.causesEnd];
}
measure();
addEventListener('resize', measure, { passive: true });
addEventListener('load', measure);
const stageU = () => (fixedU ?? (scrollY - stageTop) / vh);   // 0 at the hero, +1 per screen

// The November 2 run as a function of scroll position
function story(u) {
  const held = u >= 1.45;
  let page = 'pos', cursor = 0;
  if (u >= 2.45 && u < 3.0) { page = 'alarm'; cursor = 0; } else if (u >= 3.0 && u < 3.5) { page = 'tool'; cursor = 1; }
  const studioEnd = A.causesEnd + 0.12;
  let cause = 0;
  if (u >= A.c[0] && u < studioEnd + 0.4) cause = u < A.c[1] ? 1 : u < A.c[2] ? 2 : 3;
  return {
    load: held ? 90 : lerp(72, 90, range(u, 0.35, 1.45)),
    held, page, cursor, cause,
    block: 'N270',
    scene: u >= 3.5 && u < studioEnd ? 'studio' : 'shop',
    studioEnd,
    // a soft dip to black between the machine and the studio, not a flash
    fade: smooth(Math.max(0, 1 - Math.abs(u - 3.5) / 0.15, 1 - Math.abs(u - studioEnd) / 0.15)),
    explode: range(u, 3.55, 3.95) * (1 - smooth(range(u, A.c[2] - 0.06, A.c[2] + 0.2))),
    packed: range(u, A.c[1] - 0.05, A.c[1] + 0.2),
    dim: range(u, A.phone - 0.5, A.phone - 0.15) * 0.74,
    step: u >= A.phone - 0.5 ? 5 : Math.max(0, Math.min(4, Math.round(u))),
  };
}

// the causes list follows the scroll, with or without WebGL
const causeItems = $$('.causes li');
let causeOn = -1;
function setCause(k) {
  if (k === causeOn) return;
  causeOn = k;
  $('.causes').classList.toggle('has-active', k > 0);
  causeItems.forEach((li) => li.classList.toggle('on', Number(li.dataset.cause) === k));
}
// phones and tablets: the story's cards sit in a fixed band under the 3D and swap in place,
// so a card never slides over the screen it describes
const cards = $$('.stage .step-panel .panel');
const cardMQ = matchMedia('(max-width: 860px)');
let cardOn = -2;
function setCard(u) {
  const sEnd = A.causesEnd + 0.22;
  const k = !cardMQ.matches ? -1 : u >= 0.5 && u < 1.5 ? 0 : u >= 1.5 && u < 2.5 ? 1 : u >= 2.5 && u < 3.5 ? 2 : u >= 3.5 && u < sEnd ? 3 : -1;
  if (k === cardOn) return;
  cardOn = k;
  document.documentElement.classList.toggle('cards-fixed', cardMQ.matches);
  cards.forEach((c, i) => c.classList.toggle('is-on', i === k));
}
const causesPanel = $('.step-causes .panel');
const onStoryScroll = () => {
  const u = stageU(); setCause(story(u).cause); setCard(u);
  if (causesPanel && !cardMQ.matches) causesPanel.style.opacity = String(range(u, 3.45, 3.75));
};
addEventListener('scroll', onStoryScroll, { passive: true });
cardMQ.addEventListener('change', () => { cardOn = -2; onStoryScroll(); });
onStoryScroll();

// shop camera keyframes: one per step, held around each step and blended between
// viewX shifts the frame so the control sits to the right of the copy
const KF = {
  wide: [
    { pos: [-600, 240, 1250], look: [150, 100, -150], fov: 34, viewX: -0.24, viewY: 0 },
    { pos: [-330, 290, 980], look: [40, 190, -60], fov: 30, viewX: -0.2, viewY: 0 },
    { pos: [-500, 110, 1420], look: [30, 10, -40], fov: 32, viewX: -0.21, viewY: 0 },
    { pos: [-220, 236, 900], look: [10, 182, -40], fov: 31, viewX: -0.21, viewY: 0 },
    { pos: [-680, 230, 1380], look: [150, 100, -150], fov: 34, viewX: -0.2, viewY: 0 },
  ],
  // phones: the copy sits in the lower half, so the screen is framed whole in the upper half
  tall: [
    { pos: [-360, 200, 2260], look: [50, 40, -100], fov: 36, viewX: 0, viewY: 0.2 },
    { pos: [-210, 250, 1600], look: [10, 182, -20], fov: 34, viewX: 0, viewY: 0.15 },
    { pos: [-480, 120, 2320], look: [10, 10, -20], fov: 36, viewX: 0, viewY: 0.17 },   // the whole pendant: screen and the lit button
    { pos: [-150, 230, 1560], look: [10, 182, -20], fov: 34, viewX: 0, viewY: 0.15 },
    { pos: [-340, 200, 2100], look: [50, 40, -100], fov: 36, viewX: 0, viewY: 0.08 },
  ],
};
const mixCam = (A1, B1, t) => ({ pos: A1.pos.map((v, i) => lerp(v, B1.pos[i], t)), look: A1.look.map((v, i) => lerp(v, B1.look[i], t)), fov: lerp(A1.fov, B1.fov, t), viewX: lerp(A1.viewX || 0, B1.viewX || 0, t), viewY: lerp(A1.viewY || 0, B1.viewY || 0, t), focus: B1.focus != null && A1.focus != null ? lerp(A1.focus, B1.focus, t) : null, aperture: B1.aperture != null && A1.aperture != null ? lerp(A1.aperture, B1.aperture, t) : null });
function cameraAt(u, framing) {
  const K = KF[framing];
  const seg = (a, b, k0, k1) => mixCam(K[k0], K[k1], smooth(range(u, a, b)));
  if (u < 1) return seg(0.2, 0.85, 0, 1);
  if (u < 2) return seg(1.2, 1.85, 1, 2);
  if (u < 3.6) return seg(2.2, 2.75, 2, 3);
  return K[4];
}

let resume = 0, resumeTarget = 0, replied = false;
function resetPhone() {
  replied = false; resumeTarget = 0;
  phone.classList.remove('replied');
  $$('.thread .you, .thread [data-late]').forEach((li) => { li.hidden = true; });
  showToDo();
}
// the thread opens scrolled so the to-do list is in full view, with the history fading above it
function showToDo() { const th = $('.thread'), td = $('.thread .msg-do'); if (th && td) th.scrollTop = Math.max(0, td.offsetTop + td.offsetHeight - th.clientHeight + 8); }
addEventListener('load', showToDo);
new IntersectionObserver(([e]) => { if (e.isIntersecting && !replied) showToDo(); }).observe(phone);
replyBtn.addEventListener('click', () => {
  if (replied) return;
  replied = true;
  phone.classList.add('replied');
  const you = $('.thread .you'), late = $('.thread [data-late]'), thread = $('.thread');
  you.hidden = false;
  thread.scrollTo({ top: thread.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  setTimeout(() => {
    late.hidden = false;
    thread.scrollTo({ top: thread.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    resumeTarget = 1; if (reduce) resume = 1;
  }, reduce ? 0 : 900);
});

/* ---------- reduced motion or no WebGL: one still per step ---------- */
function posterMode() {
  const tick = () => {
    const sv = story(stageU());
    const show = sv.step >= 5 ? 0 : sv.step;
    setCause(sv.cause);
    posters.forEach((p) => { p.style.opacity = Number(p.dataset.step) === show ? '1' : '0'; });
    shade.style.setProperty('--dim', String(sv.dim));
  };
  addEventListener('scroll', tick, { passive: true });
  tick();
}

/* ---------- overlays: what Marcel reads, framed on the screen; the causes, on the tool ---------- */
function buildOverlays(st) {
  const svg = calloutSvg;
  const mk = (tag, cls) => { const e = document.createElementNS(SVGNS, tag); if (cls) e.setAttribute('class', cls); return e; };
  // region: brackets on a screen region, with a tag attached above or below it
  // point: a dot on the pendant with a leader to a tag
  // tool: a balloon (or a dot) on the exploded tool with a leader to a tag
  const items = [
    // tags never sit on the data they name: above the screen, below it, or in its empty lower area
    { kind: 'region', target: 'block', show: (u) => u >= 0.62 && u < 1.42, place: 'top', align: 'left', wideOnly: true, lines: [['BLOCK N270', 12]] },
    { kind: 'region', target: 'load', show: (u) => u >= 0.5 && u < 1.42, place: 'top', placeTall: 'below', align: 'right', lines: [['SPINDLE LOAD, RISING', 12, 'straw']] },
    { kind: 'region', target: 'status', show: (u) => u >= 1.55 && u < 2.42, place: 'below', align: 'left', lines: [['FEED HOLD AT 90%', 15, 'straw'], ['LOAD FALLS TO 6%, NO ALARM', 10.5, 'quiet']] },
    { kind: 'point', target: 'holdButton', show: (u) => u >= 1.75 && u < 2.42, off: [-210, 64], wideOnly: true, lines: [['FEED HOLD LAMP ON', 11]] },
    { kind: 'region', target: 'alarm0', show: (u) => u >= 2.5 && u < 3.0, place: 'free', align: 'left', lines: [['LAST SPINDLE OVERLOAD: OCT 29', 13, 'straw']], linesTall: [['LAST OVERLOAD: OCT 29', 13, 'straw']] },
    { kind: 'region', target: 'toolT02', show: (u) => u >= 3.05 && u < 3.5, place: 'free', align: 'left', lines: [['T02 COUNTER: 37 LEFT', 13, 'straw'], ['NOT RESET SINCE THE SWAP?', 10.5, 'quiet']] },
    // the exploded tool: part names first, then one cause at a time
    { kind: 'tool', target: 'shank', show: (u, sv) => sv.explode > 0.9 && sv.cause === 0, off: [10, 76], offTall: [34, 26], lines: [['END MILL: T02, 1/2" 3-FLUTE ROUGHER', 10.5], ['WORN CORNERS RUB, AND THE LOAD CLIMBS', 9.5, 'quiet']], linesTall: [['T02 END MILL', 10.5, 'quiet']] },
    { kind: 'tool', target: 'nut', show: (u, sv) => sv.explode > 0.9 && sv.cause === 0, off: [-20, -96], offTall: [-26, -40], lines: [['ER32 NUT', 10.5], ['TORQUED TO SPEC, OR THE TOOL CREEPS', 9.5, 'quiet']], linesTall: [['ER32 NUT', 10.5, 'quiet']] },
    { kind: 'tool', target: 'collet', show: (u, sv) => sv.explode > 0.9 && sv.cause === 0, off: [10, 96], offTall: [36, 30], lines: [['ER32 COLLET', 10.5], ['GRIP AT LEAST 2/3 OF ITS LENGTH', 9.5, 'quiet']], linesTall: [['ER32 COLLET', 10.5, 'quiet']] },
    { kind: 'tool', target: 'flange', show: (u, sv) => sv.explode > 0.9 && sv.cause === 0, off: [24, 104], offTall: [-30, -46], lines: [['CAT40 TOOL HOLDER', 10.5], ['GAUGE LINE TO TIP IS THE H02 LENGTH', 9.5, 'quiet']], linesTall: [['CAT40 HOLDER', 10.5, 'quiet']] },
    { kind: 'tool', target: 'stud', show: (u, sv) => sv.explode > 0.9 && sv.cause === 0, off: [-16, -84], offTall: [-30, -30], lines: [['PULL STUD', 10.5], ['THE DRAWBAR PULLS THE HOLDER IN HERE', 9.5, 'quiet']], linesTall: [['PULL STUD', 10.5, 'quiet']] },
    { kind: 'ball', target: 'edge', n: '1', show: (u, sv) => sv.explode > 0.9 && (sv.cause === 0 || sv.cause === 1), lines: [] },
    { kind: 'ball', target: 'flutes', n: '2', show: (u, sv) => sv.explode > 0.9 && (sv.cause === 0 || sv.cause === 2), lines: [] },
    { kind: 'ball', target: 'flange', n: '3', show: (u, sv) => (sv.explode > 0.9 && sv.cause === 0) || sv.cause === 3, lines: [] },
    { kind: 'tool', target: 'edge', from: 12, show: (u, sv) => sv.cause === 1 && u > A.c[0] + 0.12, off: [-30, 112], offTall: [10, 60], lines: [['WORN, WRONG, OR NOT SEATED?', 13, 'straw'], ['CHECK THE CORNERS, THE SHANK MARK, THE STICK-OUT', 10.5, 'quiet']], linesTall: [['WORN, WRONG, NOT SEATED?', 13, 'straw']] },
    { kind: 'tool', target: 'flutes', from: 12, show: (u, sv) => sv.cause === 2 && u > A.c[1] + 0.12, off: [-30, 118], offTall: [10, 60], lines: [['CHIPS PACKED IN THE FLUTES?', 13, 'straw'], ['OR THE COOLANT OFF THE CUT', 10.5, 'quiet']], linesTall: [['CHIPS IN THE FLUTES?', 13, 'straw']] },
    { kind: 'dim', show: (u, sv) => sv.cause === 3 && u > A.c[2] + 0.16, lines: [['H02: TOOL LENGTH OFFSET', 13, 'straw'], ['RE-MEASURED AFTER THE SWAP?', 10.5, 'quiet']], linesTall: [['H02 LENGTH OFFSET', 13, 'straw']] },
  ];
  const PADX = 9, PADY = 7, LINE_GAP = 1.0;   // space between a tag's lines, as a fraction of the line's size
  // a tag is a dark plate with plotted lettering; some items carry a shorter version for phones
  function makeText(lines) {
    const g = mk('g'); let y = PADY + 5, maxW = 0; const paths = [];   // plotted capitals rise above their size, so more room on top
    for (const [str, size, tone] of lines) {
      y += size;
      const { d, width } = hersheyPath(str, size, PADX, y, 'start');
      const p = mk('path', tone === 'straw' ? 'let let-straw' : tone === 'quiet' ? 'let let-quiet' : 'let'); p.setAttribute('d', d);
      g.appendChild(p); paths.push(p); maxW = Math.max(maxW, width); y += size * LINE_GAP;
    }
    const w = lines.length ? maxW + PADX * 2 : 0, h = lines.length ? y - lines[lines.length - 1][1] * LINE_GAP + PADY + 2 : 0;
    return { g, paths, w, h };
  }
  for (const it of items) {
    it.g = mk('g', 'co'); it.g.style.opacity = '0';
    it.frame = mk('path', 'frame'); it.lead = mk('path', 'lead'); it.dot = mk('circle', 'dot'); it.dot.setAttribute('r', '2.6');
    it.ext = mk('path', 'lead'); it.dimLine = mk('path', 'dimline');
    it.tag = mk('rect', 'tag');
    it.vW = makeText(it.lines); it.vT = it.linesTall ? makeText(it.linesTall) : null;
    if (it.kind === 'ball') {
      it.ball = mk('circle', 'ball'); it.ball.setAttribute('r', '12');
      const { d } = hersheyPath(it.n, 11, 0, 0, 'middle'); it.num = mk('path', 'let let-straw'); it.num.setAttribute('d', d);
      it.vW.paths.push(it.num);
      it.g.append(it.ball, it.num);
    } else {
      it.g.append(it.frame, it.ext, it.dimLine, it.lead, it.dot, it.tag, it.vW.g);
      if (it.vT) { it.g.append(it.vT.g); it.vT.g.style.display = 'none'; }
    }
    svg.appendChild(it.g);
    it.on = false; it.v = 'W';
  }
  function plot(it, on) {
    const v = it.v === 'T' && it.vT ? it.vT : it.vW;
    const all = [it.frame, it.ext, it.dimLine, it.lead, ...v.paths].filter((p) => p.getAttribute('d'));
    all.forEach((p, i) => {
      let L = 300; try { L = p.getTotalLength() || 300; } catch {}
      p.style.strokeDasharray = `${L} ${L + 10}`;
      if (on && !reduce) {
        p.style.transition = 'none'; p.style.strokeDashoffset = String(L); p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset ${Math.min(0.8, 0.2 + L / 1200)}s linear ${i < 3 ? i * 0.1 : 0.2 + (i - 3) * 0.16}s`;
        p.style.strokeDashoffset = '0';
      } else p.style.strokeDashoffset = '0';
    });
    it.g.style.transition = on ? 'opacity 120ms linear' : 'opacity 220ms linear';
    it.g.style.opacity = on ? '1' : '0';
  }
  const tmp = [], tmp2 = [];
  const f1 = (v) => v.toFixed(1);
  const arrow = (x, y, ang) => { const a1 = ang + 2.7, a2 = ang - 2.7; return `M${f1(x + Math.cos(a1) * 9)} ${f1(y + Math.sin(a1) * 9)}L${f1(x)} ${f1(y)}L${f1(x + Math.cos(a2) * 9)} ${f1(y + Math.sin(a2) * 9)}`; };
  return {
    update(u, r, W, H, project, sv, framing) {
      const small = W < 700, sc = small ? 0.86 : 1;
      const mx = POSTER ? W * 0.1 : 14, top = 78;
      const studioNow = st.active === 'studio';
      // keep tags off the copy: right of the panel on wide screens, above the card band on tall ones
      const minX = framing === 'wide' && studioNow ? W * 0.44 : mx;
      const maxY = framing === 'tall' ? H * 0.5 : H - 16;
      let screenQ = null;
      for (const it of items) {
        const inStudio = it.kind === 'tool' || it.kind === 'ball' || it.kind === 'dim';
        const want = it.show(u, sv) && r < 0.5 && !(small && it.wideOnly) && (inStudio ? studioNow : st.active === 'shop');
        if (!want && !it.on) continue;
        // which text: the short version on phones
        const vk = small && it.vT ? 'T' : 'W';
        if (vk !== it.v && it.vT) { it.v = vk; it.vW.g.style.display = vk === 'W' ? '' : 'none'; it.vT.g.style.display = vk === 'T' ? '' : 'none'; if (it.on) plot(it, true); }
        const V = it.v === 'T' && it.vT ? it.vT : it.vW;
        const k = Math.min(sc, (W - 2 * mx) / Math.max(1, V.w));
        const w = V.w * k, h = V.h * k;
        let tx, ty, ax, ay;
        if (it.kind === 'ball') {
          const p = project(st.open.worldAnchor(it.target));
          it.ball.setAttribute('cx', f1(p.x)); it.ball.setAttribute('cy', f1(p.y)); it.num.setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y + 5.5)})`);
          if (want !== it.on) { it.on = want; plot(it, want); }
          continue;
        }
        if (it.kind === 'region') {
          const c = st.pendant.regionCorners(it.target, tmp).map((p) => project(p));
          const xs = c.map((p) => p.x), ys = c.map((p) => p.y);
          const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
          const L = 0.2;
          let d = '';
          for (let i = 0; i < 4; i++) {
            const p = c[i], n = c[(i + 1) % 4], q = c[(i + 3) % 4];
            d += `M${f1(p.x + (n.x - p.x) * L)} ${f1(p.y + (n.y - p.y) * L)}L${f1(p.x)} ${f1(p.y)}L${f1(p.x + (q.x - p.x) * L)} ${f1(p.y + (q.y - p.y) * L)}`;
          }
          it.frame.setAttribute('d', d);
          if (!screenQ) { const sc2 = st.pendant.regionCorners('screen', tmp2).map((p) => project(p)); screenQ = { top: Math.min(...sc2.map((p) => p.y)), bottom: Math.max(...sc2.map((p) => p.y)) }; }
          const place = framing === 'tall' && it.placeTall ? it.placeTall : it.place;
          tx = it.align === 'right' ? bx + bw - w : bx;
          let ky0, ky1;
          if (place === 'top') { ty = screenQ.top - 54 - h; ky0 = ty + h; ky1 = by - 3; }
          else if (place === 'below') { ty = screenQ.bottom + 22; ky0 = ty; ky1 = by + bh + 3; }
          else {   // the empty lower part of the screen
            const fc = st.pendant.regionCorners('free', tmp2).map((p) => project(p));
            tx = Math.min(...fc.map((p) => p.x)); ty = Math.min(...fc.map((p) => p.y)); ky0 = ty; ky1 = by + bh + 3;
          }
          tx = Math.max(mx, Math.min(W - w - mx, tx)); ty = Math.max(top, Math.min(maxY - h, ty));
          const kx = Math.min(Math.max(it.align === 'right' ? bx + bw - 14 : bx + 14, tx + 8), tx + w - 8);
          it.lead.setAttribute('d', `M${f1(kx)} ${f1(ky0)}L${f1(kx)} ${f1(ky1)}`);
          it.dot.setAttribute('r', '0');
        } else if (it.kind === 'dim') {
          // H02: from the gauge line on the holder flange to the tool tip, drawn off to one side
          const o = st.open;
          const g = project(o.axisPoint(o.parts.holder.position.y + 70)), t2 = project(o.axisPoint(o.parts.endmill.position.y));
          const dx = t2.x - g.x, dy = t2.y - g.y, len = Math.hypot(dx, dy) || 1;
          let nx = -dy / len, ny = dx / len; if (ny < 0) { nx = -nx; ny = -ny; }   // offset toward the lower side
          const off = small ? 34 : 64;
          const A1 = [g.x + nx * off, g.y + ny * off], B1 = [t2.x + nx * off, t2.y + ny * off];
          it.ext.setAttribute('d', `M${f1(g.x + nx * 8)} ${f1(g.y + ny * 8)}L${f1(A1[0] + nx * 10)} ${f1(A1[1] + ny * 10)}M${f1(t2.x + nx * 8)} ${f1(t2.y + ny * 8)}L${f1(B1[0] + nx * 10)} ${f1(B1[1] + ny * 10)}`);
          const ang = Math.atan2(B1[1] - A1[1], B1[0] - A1[0]);
          it.dimLine.setAttribute('d', `M${f1(A1[0])} ${f1(A1[1])}L${f1(B1[0])} ${f1(B1[1])}` + arrow(A1[0], A1[1], ang + Math.PI) + arrow(B1[0], B1[1], ang));
          ax = (A1[0] + B1[0]) / 2; ay = (A1[1] + B1[1]) / 2;
          tx = ax + nx * 28 - (nx < 0 ? w : 0); ty = ay + ny * 28;
          tx = Math.max(minX, Math.min(W - w - mx, tx)); ty = Math.max(top, Math.min(maxY - h, ty));
          const sx = Math.max(tx, Math.min(tx + w, ax)), sy = ty;
          it.lead.setAttribute('d', `M${f1(ax)} ${f1(ay)}L${f1(sx)} ${f1(sy)}`);
          it.dot.setAttribute('cx', f1(ax)); it.dot.setAttribute('cy', f1(ay));
          it.frame.removeAttribute('d');
        } else {
          if (it.kind === 'point') { const p = project(st.pendant.worldPoint(...st.pendant.points[it.target])); ax = p.x; ay = p.y; it.frame.removeAttribute('d'); }
          else { const p = project(st.open.worldAnchor(it.target)); ax = p.x; ay = p.y; it.frame.removeAttribute('d'); }
          const off = small && it.offTall ? it.offTall : it.off;
          tx = ax + off[0] * (small ? 0.8 : 1); ty = ay + off[1] * (small ? 0.8 : 1);
          if (off[0] < 0) tx -= w;
          if (off[1] < 0) ty -= h;
          tx = Math.max(minX, Math.min(W - w - mx, tx)); ty = Math.max(top, Math.min(maxY - h, ty));
          // leader: from the mark to the nearest side of the tag, with one elbow
          const sideX = ax < tx ? tx : ax > tx + w ? tx + w : tx + w / 2;
          const sideY = Math.max(ty + 6, Math.min(ty + h - 6, ay));
          const ex = ax < tx || ax > tx + w ? sideX - Math.sign(sideX - ax) * 18 : sideX;
          const startR = it.from || 0;
          const a2 = Math.atan2(sideY - ay, ex - ax);
          it.lead.setAttribute('d', `M${f1(ax + Math.cos(a2) * startR)} ${f1(ay + Math.sin(a2) * startR)}L${f1(ex)} ${f1(sideY)}L${f1(sideX)} ${f1(sideY)}`);
          it.dot.setAttribute('cx', f1(ax)); it.dot.setAttribute('cy', f1(ay)); it.dot.setAttribute('r', it.from ? '0' : '2.6');
        }
        it.tag.setAttribute('x', f1(tx)); it.tag.setAttribute('y', f1(ty));
        it.tag.setAttribute('width', f1(w)); it.tag.setAttribute('height', f1(h));
        V.g.setAttribute('transform', `translate(${f1(tx)} ${f1(ty)})${k !== 1 ? ` scale(${k.toFixed(3)})` : ''}`);
        if (want !== it.on) { it.on = want; plot(it, want); }
      }
    },
  };
}

/* ---------- WebGL ---------- */
async function startGL() {
  const canvas = $('.stage-canvas');
  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2')) return false;
  const [THREE, A1, A2, A3, A4, A5, A6, A7, A8, { createStage }] = await Promise.all([
    import('three'),
    import('three/addons/geometries/RoundedBoxGeometry.js'), import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/BokehPass.js'), import('three/addons/postprocessing/ShaderPass.js'),
    import('three/addons/postprocessing/OutputPass.js'), import('three/addons/lights/RectAreaLightUniformsLib.js'), import('../shared/stage3d.js'),
  ]);
  await Promise.all(['600 40px "Hubot Sans"', '400 40px "Martian Mono"'].map((f) => document.fonts.load(f).catch(() => {})));
  const quality = qs.get('q') || (coarse || Math.min(screen.width, screen.height) < 700 ? 'low' : 'high');
  let st;
  try {
    st = createStage(THREE, { RoundedBoxGeometry: A1.RoundedBoxGeometry, EffectComposer: A2.EffectComposer, RenderPass: A3.RenderPass, UnrealBloomPass: A4.UnrealBloomPass, BokehPass: A5.BokehPass, ShaderPass: A6.ShaderPass, OutputPass: A7.OutputPass, RectAreaLightUniformsLib: A8.RectAreaLightUniformsLib }, { canvas, quality });
  } catch (e) { console.warn(e); return false; }

  let W = 0, H = 0, tall = false;
  // resolution follows the machine: start sharp, drop a step if frames run long, climb back when there's headroom
  const DPR_MAX = Math.min(devicePixelRatio || 1, quality === 'low' ? 1.5 : 2), DPR_MIN = Math.min(1, DPR_MAX);
  let dprScale = quality === 'low' ? 1 : 0.85, ema = 16, lastAdapt = 0;
  const dprNow = () => Math.max(DPR_MIN, DPR_MAX * dprScale);
  function adapt(rawMs, now) {
    ema += (rawMs - ema) * 0.08;
    if (now - lastAdapt < 1500) return;
    lastAdapt = now;
    const before = dprScale;
    if (ema > 24 && dprScale > 0.6) dprScale -= 0.1;
    else if (ema < 13 && dprScale < 1) dprScale += 0.05;
    if (dprScale !== before) st.resize(W, H, dprNow());
  }
  const fitCache = {};
  function size() {
    W = canvas.clientWidth; H = canvas.clientHeight; tall = W / H < 0.8;
    for (const k of Object.keys(fitCache)) delete fitCache[k];
    st.resize(W, H, dprNow());
    calloutSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }
  size();
  addEventListener('resize', size, { passive: true });

  // the exploded tool: posed for the screen shape, then framed whole and part by part
  const POSE = { wide: [0.1, 0.32, -(Math.PI / 2 - 0.42)], tall: [0.12, 0.3, -(Math.PI / 2 - 0.78)] };
  const RECT = { wide: [0.46, 0.15, 0.965, 0.86], tall: [0.06, 0.1, 0.94, 0.5] };
  const RECT_FOCUS = { wide: [0.5, 0.2, 0.95, 0.8], tall: [0.12, 0.12, 0.88, 0.46] };
  const DIR = [-0.06, 0.24, 1];
  let posed = null;
  function boxPoints(part, box, out) {
    // the 8 corners of a local box on a part, in world space
    for (const x of [box[0], box[3]]) for (const y of [box[1], box[4]]) for (const z of [box[2], box[5]]) out.push(new THREE.Vector3(x, y, z).applyMatrix4(part.matrixWorld));
    return out;
  }
  function studioCams(framing) {
    const key = framing + ':' + (W / H).toFixed(3);
    if (fitCache[key]) return fitCache[key];
    const o = st.open;
    o.root.rotation.set(...POSE[framing]); posed = framing;
    o.update({ explode: 1, spin: 0, t: 0 });
    o.spinner.rotation.y = -0.35;
    o.root.updateMatrixWorld(true);
    const P = o.parts, R = o.R;
    const all = [];
    boxPoints(P.endmill, [-R, 0, -R, R, o.OAL, R], all);
    boxPoints(P.nut, [-25, 0, -25, 25, 22.5, 25], all);
    boxPoints(P.collet, [-16.5, 0, -16.5, 16.5, 40, 16.5], all);
    boxPoints(P.holder, [-31.75, 0, -31.75, 31.75, 138.25, 31.75], all);
    boxPoints(P.stud, [-11.25, -21.5, -11.25, 11.25, 20.1, 11.25], all);
    const fov = framing === 'tall' ? 30 : 24;
    const overview = st.fit(all, { dir: DIR, fov, rect: RECT[framing] });
    const f1 = st.fit([...boxPoints(P.endmill, [-R, 0, -R, R, o.OAL, R], []), ...boxPoints(P.nut, [-25, 0, -25, 25, 22.5, 25], []), ...boxPoints(P.collet, [-16.5, 0, -16.5, 16.5, 40, 16.5], [])], { dir: [-0.1, 0.28, 1], fov, rect: RECT_FOCUS[framing] });
    const f2 = st.fit(boxPoints(P.endmill, [-R, 0, -R, R, 40, R], []), { dir: [-0.16, 0.3, 1], fov, rect: RECT_FOCUS[framing] });
    // assembled, for the gauge-line-to-tip length
    o.update({ explode: 0, spin: 0, t: 0 }); o.root.updateMatrixWorld(true);
    const asm = [];
    boxPoints(P.endmill, [-R, 0, -R, R, o.OAL, R], asm); boxPoints(P.holder, [-31.75, 0, -31.75, 31.75, 138.25, 31.75], asm); boxPoints(P.stud, [-11.25, -21.5, -11.25, 11.25, 20.1, 11.25], asm);
    const f3 = st.fit(asm, { dir: [-0.04, 0.22, 1], fov, rect: framing === 'tall' ? [0.1, 0.12, 0.9, 0.48] : [0.5, 0.16, 0.92, 0.8] });
    o.update({ explode: 1, spin: 0, t: 0 }); o.root.updateMatrixWorld(true);
    overview.aperture = 0.0000009; f1.aperture = f2.aperture = 0.0000042; f3.aperture = 0.000001;
    return (fitCache[key] = [overview, f1, f2, f3]);
  }
  // in each close-up the other parts slide away along the axis, out of frame
  const SLIDE = [
    { endmill: 0, nut: 0, collet: 0, holder: 0, stud: 0 },
    { endmill: 0, nut: 0, collet: 0, holder: 330, stud: 330 },     // 1: the cutter and what grips it
    { endmill: 0, nut: 330, collet: 330, holder: 330, stud: 330 }, // 2: the flutes alone
    { endmill: 0, nut: 0, collet: 0, holder: 0, stud: 0 },         // 3: back together, for the length offset
  ];
  function slideAt(u, sv) {
    const k = sv.cause;
    if (k === 0) return SLIDE[0];
    const t = smooth(range(u, A.c[k - 1] - 0.08, A.c[k - 1] + 0.18));
    const a = SLIDE[k - 1], b = SLIDE[k], out = {};
    for (const key of Object.keys(b)) out[key] = lerp(a[key], b[key], t);
    return out;
  }
  function studioCamera(u, sv, framing) {
    const C = studioCams(framing);
    // blend into each cause around its start, and back out to the whole tool at the end
    const k = sv.cause;
    if (k === 0) return C[0];
    const t0 = A.c[k - 1];
    const prev = k === 1 ? C[0] : C[k - 1];
    return mixCam(prev, C[k], smooth(range(u, t0 - 0.08, t0 + 0.18)));
  }

  const overlays = buildOverlays(st);
  let px = 0, tx = 0;
  if (!coarse) addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; }, { passive: true });
  let t = 0, last = performance.now(), holdAt = null, xHold = null, visible = true, running = false, frames = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe($('.stage-pin'));

  function frame(now) {
    running = false;
    if (!visible) return;
    const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, raw); last = now; t += dt;
    if (!POSTER && raw < 0.25) adapt(raw * 1000, now);
    if (POSTER) t = Number(qs.get('t') || 9.4);
    const u = stageU(), sv = story(u);
    if (u < 1.3 && replied) resetPhone();
    // the reply brings the machine back on a wall clock, so slow frames still finish it in about 2 s
    resume += (resumeTarget - resume) * Math.min(1, Math.min(0.5, raw) * 2.4);
    if (Math.abs(resumeTarget - resume) < 0.002) resume = resumeTarget;
    const r = smooth(resume);
    const heldNow = sv.held && r < 0.5;
    if (heldNow && holdAt === null) holdAt = POSTER ? t - 5 : t;
    if (!heldNow) holdAt = null;
    // in feed hold the tool stops cutting, so the load falls; the peak stays marked
    const sinceHold = holdAt === null ? 0 : t - holdAt;
    const holdLoad = lerp(90, 6, smooth(clamp01(sinceHold / 1.1))) + Math.sin(t * 5.3) * 0.4;
    // the screen
    const xNow = 3.9 - ((t * 0.667) % 3.3);   // F40 at this scale
    if (heldNow && xHold === null) xHold = xNow;
    if (!heldNow) xHold = null;
    st.pendant.update({
      page: r > 0.5 ? 'pos' : sv.page, cursor: sv.cursor, block: r > 0.5 ? 'N330' : sv.block,
      load: r > 0.5 ? 39 + Math.sin(t * 2.1) * 0.8 : heldNow ? holdLoad : sv.load + Math.sin(t * 3.7) * 0.6,
      held: heldNow, resumed: r > 0.5, clock: t, peak: heldNow ? 90 : 0,
      x: heldNow ? xHold : r > 0.5 ? 0.6 + ((t * 0.6) % 3.3) : xNow, y: r > 0.5 ? 4.15 : 3.25, z: -0.125,
      holdLamp: heldNow ? 1 : 0, startLamp: heldNow ? 0 : 1,
    });
    st.setStack(heldNow ? 'amber' : 'green');
    st.cut.update({ t, spin: 0.55, holdAt });
    // scene and camera
    const framing = tall ? 'tall' : 'wide';
    const scene = r > 0.5 ? 'shop' : sv.scene;
    if (st.active !== scene) st.setScene(scene);
    px += (tx - px) * Math.min(1, dt * 2.5);
    if (scene === 'studio') {
      const cam = ctl.cam || studioCamera(u, sv, framing);
      if (posed !== framing) studioCams(framing);
      st.open.update({ explode: sv.explode, packed: sv.packed, spin: 0, t: 0 });
      const sl = slideAt(u, sv);
      for (const k of Object.keys(sl)) st.open.parts[k].position.y += sl[k];
      st.open.spinner.rotation.y = -0.35 + (1 - smooth(sv.explode)) * 0.6;
      st.setCamera({ ...cam, pos: [cam.pos[0] + px * 30, cam.pos[1], cam.pos[2]] });
    } else {
      const cam = ctl.cam || cameraAt(u >= sv.studioEnd || r > 0.5 ? 9 : u, framing);
      // between a laptop and a wide monitor the copy is relatively wider, so the control moves further right
      const vx = (cam.viewX || 0) + (framing === 'wide' && W < 1366 ? -0.045 * (1366 - Math.max(1100, W)) / 266 : 0);
      st.setCamera({ ...cam, viewX: vx, pos: [cam.pos[0] + px * 60, cam.pos[1], cam.pos[2]] });
    }
    st.render(); frames++;
    shade.style.setProperty('--dim', String(lerp(sv.dim, 0.3, r)));
    fadeEl.style.opacity = String(r > 0.5 ? 0 : sv.fade);
    overlays.update(u, r, W, H, st.project, sv, framing);
    setCause(sv.cause);
    const liveLoad = $('[data-live="load"]'); if (liveLoad && !sv.held) liveLoad.textContent = String(Math.round(sv.load));
    if (!stage.classList.contains('gl-on')) stage.classList.add('gl-on');
    ctl.frames = frames; ctl.u = u; ctl.scene = st.active;
    if (!ctl.paused) kick();
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  // test hooks: the screenshot tool pauses the loop so a slow software renderer can be captured
  const ctl = window.__marcelStage = { frames: 0, u: 0, scene: 'shop', paused: false, A, kick: () => { ctl.paused = false; kick(); } };
  addEventListener('scroll', kick, { passive: true });
  replyBtn.addEventListener('click', kick);
  await st.compile();
  kick();
  return true;
}

(async () => {
  let ok = false;
  if (!reduce && !/[?&]noGL/.test(location.search)) { try { ok = await startGL(); } catch (e) { console.warn('3D off:', e); ok = false; } }
  if (!ok) posterMode();
})();

/* ======================= THE ENGRAVING: Machine 3 cuts MARCEL while Marcel watches ======================= */
{
  const fig = $('.engrave');
  if (fig) {
    const canvas = $('.engrave-canvas', fig), list = $('.gcode', fig), statusEl = $('.eh-text', fig), again = $('.engrave-again', fig), speedEl = $('.eh-speed', fig);
    const EPOSTER = qs.has('engrave');            // ?engrave=<t> renders a still for the poster
    if (EPOSTER) document.documentElement.classList.add('engrave-still');
    let E = null, booting = false, visible = false, running = false, t = 0, last = 0, settle = 0, shownBlock = -1, wide = true, frames = 0;
    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    function showBlocks(blocks, idx) {
      if (idx === shownBlock) return;
      shownBlock = idx;
      const from = Math.max(0, Math.min(blocks.length - 6, idx - 2));
      list.innerHTML = blocks.slice(from, from + 6).map((b, i) => {
        const j = from + i, cls = j === idx ? 'cur' : Math.abs(j - idx) > 1 ? 'far' : '';
        return `<li class="${cls}">${b.n ? `<span class="n">N${String(b.n).padStart(4, '0')}</span>` : ''}${esc(b.code)}</li>`;
      }).join('');
    }
    function blockIndex(blocks, tt) { let k = 0; for (let i = 0; i < blocks.length; i++) if (blocks[i].t0 <= tt + 1e-6) k = i; return k; }
    function status() {
      const s = E.state;
      if (s.done) statusEl.textContent = 'M30, cycle complete. No alarm.';
      else statusEl.textContent = `Marcel is watching. Load ${Math.max(0, Math.round(s.load))}%, no alarm.`;
    }
    // a slow push-in while it cuts
    const cam = () => { const k = E ? smooth(t / E.prog.duration) : 0; return wide
      ? { pos: [lerp(-74, -46, k), lerp(106, 96, k), lerp(292, 262, k)], look: [4, 10, -4], fov: 24 }
      : { pos: [lerp(-40, -24, k), lerp(300, 284, k), lerp(376, 356, k)], look: [0, 0, 4], fov: 34 }; };
    function size() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      wide = w / h > 1;
      E.resize(w, h, Math.min(devicePixelRatio || 1, 1.6));
    }
    async function boot() {
      if (booting) return; booting = true;
      if (!document.createElement('canvas').getContext('webgl2')) return;
      const [THREE, A2, A3, A4, A5, A6, A7, A8, { createEngrave }] = await Promise.all([
        import('three'), import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/BokehPass.js'), import('three/addons/postprocessing/ShaderPass.js'),
        import('three/addons/postprocessing/OutputPass.js'), import('three/addons/lights/RectAreaLightUniformsLib.js'), import('../shared/engrave3d.js'),
      ]);
      const quality = qs.get('q') || (coarse || Math.min(screen.width, screen.height) < 700 ? 'low' : 'high');
      try {
        E = createEngrave(THREE, { EffectComposer: A2.EffectComposer, RenderPass: A3.RenderPass, UnrealBloomPass: A4.UnrealBloomPass, BokehPass: A5.BokehPass, ShaderPass: A6.ShaderPass, OutputPass: A7.OutputPass, RectAreaLightUniformsLib: A8.RectAreaLightUniformsLib }, { canvas, quality, HERSHEY });
      } catch (e) { console.warn('engraving off:', e); return; }
      speedEl.textContent = String(Math.max(2, Math.round(E.prog.speedup)));
      size();
      // size from the canvas box itself, so a late layout (tablets, font swaps) never leaves a strip unrendered
      new ResizeObserver(() => { size(); E.setCamera(cam()); E.render(); kick(); }).observe(canvas);
      if (EPOSTER) {
        const T = Math.min(E.prog.duration, Number(qs.get('engrave')) || E.prog.duration);
        for (let tt = 0; tt < T;) { tt = Math.min(T, tt + 1 / 30); E.update(tt, 1 / 30); }
        for (let i = 0; i < 90; i++) E.update(T, 1 / 30);
        t = T;
      }
      E.setCamera(cam());
      await E.compile();
      showBlocks(E.prog.blocks, blockIndex(E.prog.blocks, t)); status();
      E.render(); fig.classList.add('gl-on');
      window.__marcelEngrave = { get frames() { return frames; }, get t() { return t; }, duration: E.prog.duration, paused: false, kick: () => kick() };
      if (!EPOSTER) kick();
    }
    function frame(now) {
      running = false;
      if (!visible || !E) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      const done = t >= E.prog.duration;
      if (!done) t = Math.min(E.prog.duration, t + dt); else settle += dt;
      E.update(t, dt);
      E.setCamera(cam());
      E.render(); frames++;
      showBlocks(E.prog.blocks, blockIndex(E.prog.blocks, t)); status();
      if (done && again.hidden) again.hidden = false;
      // keep drawing until the last chips land, then rest
      if ((!done || settle < 2.5) && !(window.__marcelEngrave && window.__marcelEngrave.paused)) kick();
    }
    function kick() { if (!running && E) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
    again.addEventListener('click', () => { if (!E) return; E.reset(); t = 0; settle = 0; again.hidden = true; shownBlock = -1; kick(); });
    if (reduce) {
      // no animation: the finished plate (poster) and the end of the program
      speedEl.parentElement.textContent = 'A 3D drawing of Machine 3 after engraving a plate.';
      import('../shared/engrave3d.js').then(({ toolpath, program }) => {
        const p = program(toolpath(HERSHEY, 'MARCEL', { height: 25.4, tracking: 0.16 }));
        showBlocks(p.blocks, p.blocks.length - 1);
      }).catch(() => {});
      statusEl.textContent = 'M30, cycle complete. No alarm.';
    } else {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting && e.intersectionRatio > 0.3;
        if (visible) { boot(); kick(); }
      }, { threshold: [0, 0.3, 0.6] }).observe(fig);
      if (EPOSTER) { visible = true; boot(); }
    }
  }
}

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
  if (matchMedia('(max-width: 600px)').matches) video.poster = 'media/film-poster-phone.jpg';
  beats.forEach((b) => b.addEventListener('click', () => {
    video.currentTime = Number(b.dataset.t) + 0.05;
    video.play().catch(() => {});
  }));
  video.addEventListener('play', () => video.classList.add('playing'));
  video.addEventListener('pause', () => video.classList.remove('playing'));
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
