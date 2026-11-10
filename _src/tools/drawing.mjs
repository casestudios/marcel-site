// Builds the signal-path drawing: an isometric exploded parts drawing, as M/L polylines only,
// so every stroke has a known length and can be plotted. Two layouts: wide and tall.
import { textPath } from './hershey.mjs';

const C30 = Math.cos(Math.PI / 6), S30 = 0.5;

export function buildDrawing(variant = 'wide') {
  const K = variant === 'wide' ? 1.32 : 1.18;
  const O = variant === 'wide' ? [600, 210] : [218, 140];
  const iso = (x, y, z) => [O[0] + (x - y) * C30 * K, O[1] + (x + y) * S30 * K - z * K];
  const strokes = []; // { d, len, cls, item, order }
  let order = 0;
  const fmt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  function poly2d(pts, cls, item, closed = false, o = order++) {
    const P = closed ? [...pts, pts[0]] : pts;
    strokes.push({ d: 'M' + P.map(fmt).join('L'), len: polyLen(P), cls, item, order: o });
  }
  const poly3 = (pts3, cls, item, closed = false, o) => poly2d(pts3.map((p) => iso(...p)), cls, item, closed, o);
  const fills = []; // opaque face fills (drawn before strokes of the same object to hide what is behind)

  // A box: visible faces are +x (front right), +y (front left), +z (top).
  function box(x0, y0, z0, w, d, h, item, opts = {}) {
    const x1 = x0 + w, y1 = y0 + d, z1 = z0 + h;
    const faceTop = [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    const faceX = [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]];
    const faceY = [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    fills.push({ pts: [...faceTop, ...[]].map((p) => iso(...p)), item, depth: x0 + y0 + z0, shade: 'top' });
    fills.push({ pts: faceX.map((p) => iso(...p)), item, depth: x0 + y0 + z0, shade: 'x' });
    fills.push({ pts: faceY.map((p) => iso(...p)), item, depth: x0 + y0 + z0, shade: 'y' });
    const o = order++;
    // silhouette (outer contour) heavy, inner edges medium
    poly3([[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z1]], 'obj', item, true, o);
    poly3([[x1, y1, z0], [x1, y1, z1]], 'edge', item, false, o);
    poly3([[x1, y1, z1], [x1, y0, z1]], 'edge', item, false, o);
    poly3([[x1, y1, z1], [x0, y1, z1]], 'edge', item, false, o);
    return { x0, y0, z0, x1, y1, z1 };
  }
  // rectangle on a face: face 'x' (u along y, v along z), 'y' (u along x, v along z), 'top' (u along x, v along y)
  function rectOn(b, face, u0, v0, uw, vh, cls, item, inset = 0) {
    let pts;
    if (face === 'x') pts = [[b.x1 + inset, b.y0 + u0, b.z0 + v0], [b.x1 + inset, b.y0 + u0 + uw, b.z0 + v0], [b.x1 + inset, b.y0 + u0 + uw, b.z0 + v0 + vh], [b.x1 + inset, b.y0 + u0, b.z0 + v0 + vh]];
    else if (face === 'y') pts = [[b.x0 + u0, b.y1 + inset, b.z0 + v0], [b.x0 + u0 + uw, b.y1 + inset, b.z0 + v0], [b.x0 + u0 + uw, b.y1 + inset, b.z0 + v0 + vh], [b.x0 + u0, b.y1 + inset, b.z0 + v0 + vh]];
    else pts = [[b.x0 + u0, b.y0 + v0, b.z1], [b.x0 + u0 + uw, b.y0 + v0, b.z1], [b.x0 + u0 + uw, b.y0 + v0 + vh, b.z1], [b.x0 + u0, b.y0 + v0 + vh, b.z1]];
    poly3(pts, cls, item, true);
    return pts;
  }
  function lineOn(b, face, u0, v0, u1, v1, cls, item) {
    const P = (u, v) => face === 'x' ? [b.x1, b.y0 + u, b.z0 + v] : face === 'y' ? [b.x0 + u, b.y1, b.z0 + v] : [b.x0 + u, b.y0 + v, b.z1];
    poly3([P(u0, v0), P(u1, v1)], cls, item);
  }
  const pointOn = (b, face, u, v) => face === 'x' ? [b.x1, b.y0 + u, b.z0 + v] : face === 'y' ? [b.x0 + u, b.y1, b.z0 + v] : [b.x0 + u, b.y0 + v, b.z1];
  // HDMI-ish port: a trapezoid on a face
  function port(b, face, u, v, w = 14, h = 6, item) {
    const P = (uu, vv) => pointOn(b, face, uu, vv);
    poly3([P(u, v + h), P(u + w, v + h), P(u + w - 2, v), P(u + 2, v)], 'det', item, true);
  }
  // bezier cable in 3D (sampled), with an arrowhead at the end in screen space
  function cable(p0, p1, p2, p3, cls, item, arrow = true, n = 40) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (1 - t) ** 3, bq = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
      pts.push(iso(a * p0[0] + bq * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + bq * p1[1] + c * p2[1] + d * p3[1], a * p0[2] + bq * p1[2] + c * p2[2] + d * p3[2]));
    }
    poly2d(pts, cls, item);
    if (arrow) {
      const e = pts[pts.length - 1], s = pts[pts.length - 4];
      const ang = Math.atan2(e[1] - s[1], e[0] - s[0]);
      const L = 9, W = 0.42;
      poly2d([[e[0] - L * Math.cos(ang - W), e[1] - L * Math.sin(ang - W)], e, [e[0] - L * Math.cos(ang + W), e[1] - L * Math.sin(ang + W)]], cls, item);
    }
    return pts;
  }
  // lettering in screen space
  function letter(str, size, x, y, item, anchor = 'start', cls = 'txt') {
    const { d, width } = textPath(str, size, { x, y, anchor, tracking: 0.1 });
    // each glyph run is M..L.. segments: approximate length by summing segments
    const segs = d.split('M').filter(Boolean).map((s) => s.split('L').map((p) => p.trim().split(/\s+/).map(Number)));
    let len = 0; for (const s of segs) len += polyLen(s);
    strokes.push({ d, len, cls, item, order: order++ });
    return width;
  }
  function balloon(n, cx, cy, tx, ty, item) {
    const r = 15, pts = [];
    for (let i = 0; i <= 36; i++) { const a = (i / 36) * Math.PI * 2 - Math.PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    poly2d(pts, 'bal', item);
    // leader from the balloon edge to the target, with a dot
    const ang = Math.atan2(ty - cy, tx - cx);
    poly2d([[cx + r * Math.cos(ang), cy + r * Math.sin(ang)], [tx, ty]], 'lead', item);
    const dot = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 2; dot.push([tx + 2.2 * Math.cos(a), ty + 2.2 * Math.sin(a)]); }
    poly2d(dot, 'lead', item);
    letter(String(n), 11, cx, cy + 5.5, item, 'middle', 'btxt');
  }

  // ---------------- scene ----------------
  const W = variant === 'wide';
  // place by screen intent: h = across (right), v = down/depth; z lifts up
  const at = (h, v, z) => [(h + v) / 2, (v - h) / 2, z];
  const P = W ? {
    control: at(-470, -40, 0), splitter: at(-150, 250, 40), capture: at(30, 300, 30), box: at(230, 280, 0), phone: at(470, 150, 20),
  } : {
    control: at(-70, -60, 0), splitter: at(-130, 330, 0), capture: at(70, 410, 0), box: at(60, 610, 0), phone: at(-190, 690, 0),
  };
  P.screen = [P.control[0], P.control[1] + 104, P.control[2] + 70];
  const items = {};
  // 1 the control: a cabinet with the pendant face on +y
  {
    const [x, y, z] = P.control;
    const b = box(x, y, z, 150, 70, 250, 1);
    items.control = b;
    // the opening where the screen sits (screen exploded forward)
    rectOn(b, 'y', 14, 92, 122, 140, 'hid', 1);
    // key grid under the opening
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) rectOn(b, 'y', 16 + c * 15, 16 + r * 16, 10, 10, 'det', 1);
    // cycle start / feed hold buttons on the face, round-ish (squares here)
    // ports on the +x face: network (crossed out) and USB
    const eth = rectOn(b, 'x', 20, 150, 18, 14, 'det', 1);
    const usb = rectOn(b, 'x', 46, 154, 16, 6, 'det', 1);
    items.eth = eth; items.usb = usb;
    // the big X over the network port
    const c0 = pointOn(b, 'x', 29, 157);
    const a = iso(c0[0], c0[1] - 16, c0[2] - 16), bb = iso(c0[0], c0[1] + 16, c0[2] + 16), cc = iso(c0[0], c0[1] - 16, c0[2] + 16), dd = iso(c0[0], c0[1] + 16, c0[2] - 16);
    poly2d([a, bb], 'cross', 1); poly2d([cc, dd], 'cross', 1);
    items.ethX = c0;
    // video out (HDMI) inside the opening, at the bottom of the screen bay
    port(b, 'y', 64, 96, 16, 6, 1);
    items.videoOut = pointOn(b, 'y', 72, 99);
  }
  // 3 the operator's screen, exploded forward off the pendant
  {
    const [x, y, z] = P.screen;
    const b = box(x + 16, y, z + 20, 118, 8, 136, 3);
    items.screen = b;
    rectOn(b, 'y', 8, 10, 102, 116, 'det', 3);
    // a few lines of screen text
    for (let i = 0; i < 6; i++) lineOn(b, 'y', 16, 112 - i * 13, 16 + (i % 3 === 0 ? 70 : 50 + (i * 7) % 30), 112 - i * 13, 'scr', 3);
    // the screen's HDMI input on its underside edge (+x face)
    port(b, 'x', 1, 10, 6, 10, 3);
    items.screenIn = pointOn(b, 'x', 4, 14);
  }
  // 2 splitter
  {
    const [x, y, z] = P.splitter;
    const b = box(x, y, z, 60, 52, 18, 2);
    items.splitter = b;
    port(b, 'y', 8, 6, 14, 6, 2);   // input
    port(b, 'x', 8, 6, 14, 6, 2);   // output 1
    port(b, 'x', 30, 6, 14, 6, 2);  // output 2
    items.splIn = pointOn(b, 'y', 15, 9);
    items.splOut1 = pointOn(b, 'x', 15, 9);
    items.splOut2 = pointOn(b, 'x', 37, 9);
  }
  // 4 capture-and-keyboard device
  {
    const [x, y, z] = P.capture;
    const b = box(x, y, z, 46, 46, 15, 4);
    items.capture = b;
    port(b, 'y', 8, 5, 13, 5, 4);   // HDMI in
    rectOn(b, 'x', 8, 5, 10, 4, 'det', 4);   // USB-C to the box
    rectOn(b, 'x', 26, 5, 10, 4, 'det', 4);  // keyboard out
    items.capIn = pointOn(b, 'y', 14, 7);
    items.capUsb = pointOn(b, 'x', 13, 7);
    items.capKeys = pointOn(b, 'x', 31, 7);
  }
  // 5 Marcel's box: heat-sink fins on top
  {
    const [x, y, z] = P.box;
    const b = box(x, y, z, 110, 86, 34, 5);
    items.box = b;
    for (let i = 0; i < 9; i++) lineOn(b, 'top', 10 + i * 11, 10, 10 + i * 11, 76, 'det', 5);
    rectOn(b, 'y', 12, 10, 12, 6, 'det', 5);
    rectOn(b, 'y', 30, 10, 12, 6, 'det', 5);
    items.boxIn = pointOn(b, 'y', 18, 13);
    items.boxAnt = [b.x1 - 10, b.y0 + 10, b.z1];
    // antenna
    poly3([[b.x1 - 10, b.y0 + 10, b.z1], [b.x1 - 10, b.y0 + 10, b.z1 + 46]], 'obj', 5);
  }
  // 6 the phone, standing, screen facing +y
  {
    const [x, y, z] = P.phone;
    const b = box(x, y, z, 64, 7, 130, 6);
    items.phone = b;
    rectOn(b, 'y', 5, 8, 54, 114, 'det', 6);
    // a message bubble
    rectOn(b, 'y', 10, 80, 40, 22, 'scr', 6);
    lineOn(b, 'y', 14, 94, 44, 94, 'scr', 6); lineOn(b, 'y', 14, 88, 36, 88, 'scr', 6);
    items.phoneTop = pointOn(b, 'y', 32, 128);
  }

  // ---------------- cables (signal directions) ----------------
  const v = items;
  // control video out -> splitter in
  const vidPts = cable(v.videoOut, [v.videoOut[0] + 10, v.videoOut[1] + 70, v.videoOut[2] - 60], [v.splIn[0] - 60, v.splIn[1] + 40, v.splIn[2] - 10], v.splIn, 'cab', 2);
  const vidMid = vidPts[Math.floor(vidPts.length * 0.62)];
  // splitter out 1 -> screen in (back toward the screen)
  cable(v.splOut1, [v.splOut1[0] + 40, v.splOut1[1] - 10, v.splOut1[2] + 30], [v.screenIn[0] + 60, v.screenIn[1] + 10, v.screenIn[2] - 40], v.screenIn, 'cab', 3);
  // splitter out 2 -> capture in
  cable(v.splOut2, [v.splOut2[0] + 40, v.splOut2[1] + 20, v.splOut2[2] - 20], [v.capIn[0] - 20, v.capIn[1] + 50, v.capIn[2] + 10], v.capIn, 'cab', 4);
  // capture USB -> box
  cable(v.capUsb, [v.capUsb[0] + 40, v.capUsb[1], v.capUsb[2] - 10], [v.boxIn[0] - 20, v.boxIn[1] + 40, v.boxIn[2]], v.boxIn, 'cab', 5);
  // keys: capture -> control USB (dashed: only after sign-off)
  const usbC = [v.control.x1, v.control.y0 + 54, v.control.z0 + 157];
  const keyPts = cable(v.capKeys, [v.capKeys[0] + 30, v.capKeys[1] - 160, v.capKeys[2] + 120], [usbC[0] + 160, usbC[1] - 20, usbC[2] + 80], usbC, 'key', 4);
  let keyMid = keyPts[0]; for (const q of keyPts) if (q[1] < keyMid[1]) keyMid = q;
  // wireless: box -> phone (dashed arcs)
  {
    const a = iso(...v.boxAnt.map((c, i) => (i === 2 ? c + 46 : c)));
    const b = iso(v.phone.x0 + 10, v.phone.y1, v.phone.z0 + 120);
    const pts = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * 50]); }
    poly2d(pts, 'air', 6);
    for (const k of [1, 2, 3]) {
      const arc = []; for (let i = 0; i <= 12; i++) { const ang = -Math.PI / 2 - 0.7 + (1.4 * i) / 12; arc.push([a[0] + Math.cos(ang) * 8 * k, a[1] + Math.sin(ang) * 8 * k]); }
      poly2d(arc, 'air', 6);
    }
  }

  // ---------------- balloons and notes ----------------
  const pt = (p) => iso(...p);
  if (W) {
    const c = pt([v.control.x0 + 20, v.control.y0, v.control.z1]);
    balloon(1, c[0] - 40, c[1] - 44, c[0] + 18, c[1] + 6, 1);
    const s = pt([v.screen.x0 + 10, v.screen.y1, v.screen.z1 - 6]);
    balloon(3, s[0] - 70, s[1] - 10, s[0], s[1], 3);
    const sp = pt([v.splitter.x0 + 30, v.splitter.y0 + 20, v.splitter.z1]);
    balloon(2, sp[0] + 40, sp[1] - 74, sp[0], sp[1], 2);
    const cp = pt([v.capture.x0 + 23, v.capture.y0 + 23, v.capture.z1]);
    balloon(4, cp[0] - 20, cp[1] + 96, cp[0] - 4, cp[1] + 30, 4);
    const bx = pt([v.box.x1, v.box.y0 + 30, v.box.z0 + 18]);
    balloon(5, bx[0] + 70, bx[1] + 40, bx[0], bx[1], 5);
    const ph = pt([v.phone.x1, v.phone.y0, v.phone.z1 - 20]);
    balloon(6, ph[0] + 46, ph[1] - 30, ph[0], ph[1], 6);
    // notes
    const e = pt(v.ethX);
    poly2d([[e[0] + 14, e[1] - 14], [e[0] + 44, e[1] - 64], [e[0] + 60, e[1] - 64]], 'lead', 1);
    letter('NO NETWORK CABLE', 10, e[0] + 66, e[1] - 59, 1, 'start', 'note');
    const k = keyMid;
    letter('KEYS, ONLY AFTER SIGN-OFF', 10, k[0] + 14, k[1] - 6, 4, 'start', 'note');
    const vi = vidMid;
    letter('VIDEO', 9, vi[0] - 54, vi[1] + 26, 2, 'start', 'note');
    // what actually crosses the building line, so the picture says what the text says
    letter('OVER THE INTERNET: TELEGRAM, AND TODAY A CLOUD AI MODEL', 9, ph[0] - 420, ph[1] - 64, 6, 'start', 'note');
    letter('THE CONTROL: NO NETWORK, EVER', 9, ph[0] - 420, ph[1] - 44, 6, 'start', 'note');
  } else {
    const c = pt([v.control.x0 + 20, v.control.y0, v.control.z1]);
    balloon(1, c[0] - 30, c[1] - 30, c[0] + 18, c[1] + 6, 1);
    const s = pt([v.screen.x0 + 10, v.screen.y1, v.screen.z1 - 6]);
    balloon(3, s[0] - 34, s[1] + 40, s[0], s[1], 3);
    const sp = pt([v.splitter.x0 + 30, v.splitter.y0 + 20, v.splitter.z1]);
    balloon(2, sp[0] - 40, sp[1] - 54, sp[0], sp[1], 2);
    const cp = pt([v.capture.x0 + 23, v.capture.y0 + 23, v.capture.z1]);
    balloon(4, cp[0] + 60, cp[1] - 40, cp[0], cp[1], 4);
    const bx = pt([v.box.x1, v.box.y0 + 40, v.box.z0 + 16]);
    balloon(5, bx[0] + 20, bx[1] + 60, bx[0], bx[1], 5);
    const ph = pt([v.phone.x0 + 4, v.phone.y1, v.phone.z0 + 20]);
    balloon(6, ph[0] - 10, ph[1] + 60, ph[0], ph[1], 6);
    const e = pt(v.ethX);
    letter('NO NETWORK', 9, e[0] + 30, e[1] - 34, 1, 'start', 'note');
    letter('CABLE', 9, e[0] + 30, e[1] - 18, 1, 'start', 'note');
    poly2d([[e[0] + 12, e[1] - 12], [e[0] + 26, e[1] - 30]], 'lead', 1);
  }

  // ---------------- assemble the SVG ----------------
  // bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const m of s.d.matchAll(/([-\d.]+) ([-\d.]+)/g)) { const X = +m[1], Y = +m[2]; if (X < minX) minX = X; if (Y < minY) minY = Y; if (X > maxX) maxX = X; if (Y > maxY) maxY = Y; }
  const pad = 26;
  const vb = [Math.floor(minX - pad), Math.floor(minY - pad), Math.ceil(maxX - minX + 2 * pad), Math.ceil(maxY - minY + 2 * pad)];
  // fills sorted back to front per object (object order already back to front by construction)
  const fillSvg = fills.map((f) => `<path class="fl fl-${f.shade}" data-item="${f.item}" d="M${f.pts.map(fmt).join('L')}Z"/>`).join('');
  // group strokes per item so the BOM can highlight them; keep plot order in data-o
  const byItem = {};
  for (const s of strokes) (byItem[s.item] ||= []).push(s);
  let body = '';
  // draw objects in construction order: each object's fills then its strokes, so nearer objects cover farther ones
  const itemOrder = [1, 3, 2, 4, 5, 6];
  for (const it of itemOrder) {
    const myFills = fills.filter((f) => f.item === it).map((f) => `<path class="fl fl-${f.shade}" d="M${f.pts.map(fmt).join('L')}Z"/>`).join('');
    const myStrokes = (byItem[it] || []).map((s) => `<path class="pl ${s.cls}" d="${s.d}" style="--l:${s.len.toFixed(1)};--o:${s.order}"/>`).join('');
    body += `<g class="item" data-item="${it}">${myFills}${myStrokes}</g>`;
  }
  void fillSvg;
  return { viewBox: vb.join(' '), body, count: strokes.length, maxOrder: order };
}
