// toolrig.js: T02 (1/2" 3-flute rougher) in a CAT40 ER32 holder, a workpiece in a vise, and chips.
// Built from real dimensions (mm). No renderer here: the caller adds `rig.root`, `rig.work` and
// `rig.chipRoot` to a scene. Everything visible is a function of the state passed to update().

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildToolRig(THREE, opts = {}) {
  const { quality = 'high', chips = true, work: withWork = true, vise = true, packed = false, seed = 20261102, cutter = 'rougher', toolNo = 'T02' } = opts;
  const Q = quality === 'high';
  const SEG = Q ? 144 : 80;

  const canvasTex = (w, h, draw, srgb = true) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const tex = new THREE.CanvasTexture(c);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  };

  // ---------- materials ----------
  const mat = {
    holder: new THREE.MeshPhysicalMaterial({ color: 0xb6b9bd, metalness: 1, roughness: 0.22, clearcoat: 0.35, clearcoatRoughness: 0.18 }),
    holderDark: new THREE.MeshPhysicalMaterial({ color: 0x2c2e31, metalness: 1, roughness: 0.55, side: THREE.DoubleSide }),
    bore: new THREE.MeshPhysicalMaterial({ color: 0x2a2b2e, metalness: 1, roughness: 0.35, side: THREE.DoubleSide }),
    thread: new THREE.MeshPhysicalMaterial({ color: 0x9a9da1, metalness: 1, roughness: 0.34 }),
    nut: new THREE.MeshPhysicalMaterial({ color: 0xc2c4c7, metalness: 1, roughness: 0.18 }),
    stud: new THREE.MeshPhysicalMaterial({ color: 0xa3a6aa, metalness: 1, roughness: 0.28 }),
    carbide: new THREE.MeshPhysicalMaterial({ color: 0xaeb0b3, metalness: 1, roughness: 0.16 }),
    // AlTiN-style coating: near black with a faint violet-gold film
    coat: new THREE.MeshPhysicalMaterial({ color: 0x2e2c33, metalness: 0.92, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.28, iridescence: 0.35, iridescenceIOR: 1.8, iridescenceThicknessRange: [300, 420] }),
    steelSide: new THREE.MeshPhysicalMaterial({ color: 0x4f5256, metalness: 0.9, roughness: 0.52 }),
    steelCut: new THREE.MeshPhysicalMaterial({ color: 0xb4b7bb, metalness: 1, roughness: 0.2 }),
    vise: new THREE.MeshPhysicalMaterial({ color: 0x2c3a46, metalness: 0.3, roughness: 0.62 }),          // painted cast iron
    viseGround: new THREE.MeshPhysicalMaterial({ color: 0x9fa3a8, metalness: 1, roughness: 0.3 }),       // ground jaws and ways
  };

  const faceTex = (() => {
    const r = rng(7);
    const tex = canvasTex(2048, 1024, (g, w, h) => {
      g.fillStyle = '#8f9296'; g.fillRect(0, 0, w, h);
      for (let pass = 0; pass < 3; pass++) {
        const cy = (pass + 0.5) * (h / 2.6) - 40;
        for (let x = -400; x < w + 400; x += 7) {
          g.strokeStyle = `rgba(${200 + r() * 40},${200 + r() * 40},${205 + r() * 40},${0.05 + r() * 0.09})`;
          g.lineWidth = 1 + r() * 1.6;
          g.beginPath(); g.arc(x, cy, 380, -0.9, 0.9); g.stroke();
        }
      }
    });
    tex.repeat.set(1 / 220, 1 / 70); tex.offset.set(150 / 220, 35 / 70);
    return tex;
  })();
  mat.steelTop = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: faceTex, metalness: 1, roughness: 0.3 });

  const holderMarkTex = canvasTex(2048, 256, (g, w, h) => {
    g.fillStyle = '#cfd1d4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26272a';
    g.font = '600 132px "Hubot Sans", "Mona Sans", Arial, sans-serif';
    g.textBaseline = 'middle';
    g.fillText(toolNo, w * 0.06, h * 0.52);
    g.font = '500 54px "Hubot Sans", "Mona Sans", Arial, sans-serif';
    g.fillText('CAT40  ER32  2.75', w * 0.21, h * 0.52);
    g.fillText(toolNo, w * 0.56, h * 0.52);
    g.fillText('CAT40  ER32  2.75', w * 0.66, h * 0.52);
  });
  holderMarkTex.wrapS = THREE.RepeatWrapping;
  mat.holderBody = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: holderMarkTex, metalness: 1, roughness: 0.24, clearcoat: 0.35, clearcoatRoughness: 0.18 });
  const shankMarkTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#c9cbce'; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w * 0.62, h * 0.5); g.rotate(-Math.PI / 2);
    g.fillStyle = '#34353a';
    g.font = '500 30px "Hubot Sans", "Mona Sans", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('1/2  3FL  ROUGH  AlTiN', 0, 0);
    g.restore();
  });
  mat.shank = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: shankMarkTex, metalness: 1, roughness: 0.16 });

  // ---------- geometry helpers ----------
  function lathe(runs, material, segs = SEG, phiStart = 0, phiLength = Math.PI * 2) {
    const g = new THREE.Group();
    for (const item of runs) {
      const run = Array.isArray(item) ? item : item.pts;
      const pts = run.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y));
      const geo = new THREE.LatheGeometry(pts, segs, phiStart, phiLength);
      const m = new THREE.Mesh(geo, Array.isArray(item) ? material : item.mat);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    }
    return g;
  }
  const arc = (cx, cy, rad, a0, a1, n) => {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); out.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]); }
    return out;
  };
  // a thread as stacked V rings between y0 and y1 (a helix reads the same at this scale)
  const threadRun = (rMajor, rMinor, y0, y1, pitch) => {
    const pts = [];
    const n = Math.max(1, Math.round((y1 - y0) / pitch));
    const p = (y1 - y0) / n;
    for (let i = 0; i <= n; i++) {
      pts.push([rMinor, y0 + i * p]);
      if (i < n) pts.push([rMajor, y0 + i * p + p / 2]);
    }
    return pts;
  };
  // a ring sector with flat end walls (for slots and notches)
  function sector(profile, phi0, phi1, material, segs) {
    const g = lathe([profile], material, segs, phi0, phi1 - phi0);
    // close the two cut faces with flat walls following the profile
    const shape = new THREE.Shape();
    const inner = profile.map(([r, y]) => [r, y]);
    shape.moveTo(inner[0][0], inner[0][1]);
    for (const [r, y] of inner.slice(1)) shape.lineTo(r, y);
    const wall = new THREE.ShapeGeometry(shape);
    for (const phi of [phi0, phi1]) {
      const w = new THREE.Mesh(wall, mat.holderDark);
      w.rotation.y = phi;
      g.add(w);
    }
    return g;
  }

  // ---------- the end mill (tool frame: y=0 at the tip) ----------
  const D = 12.7, R = D / 2, LOC = 25.4, RUNOUT = 4.5, OAL = 76.2;
  const twistRate = Math.tan((38 * Math.PI) / 180) / R;
  const FL = 3, RCORE = 0.57 * R;
  function sectionR(th, k) {
    const per = (2 * Math.PI) / FL;
    const u = (((th % per) + per) % per) / per;
    let r;
    if (u < 0.045) { const s = u / 0.045; r = R - (R - 0.74 * R) * Math.pow(s, 0.7); }
    else if (u < 0.56) { const s = (u - 0.045) / (0.56 - 0.045); const dip = Math.sin(Math.PI * Math.pow(s, 0.85)); const base = 0.74 * R + (0.93 * R - 0.74 * R) * s; r = base - (base - RCORE) * dip * 0.98; }
    else if (u < 0.86) { const s = (u - 0.56) / 0.3; r = 0.93 * R + (R - 0.025 - 0.93 * R) * (1 - Math.pow(1 - s, 2)); }
    else r = R - 0.025 * (1 - (u - 0.86) / 0.14);
    return R - (R - r) * k;
  }
  function buildFlutes() {
    const NA = Q ? 3 * 150 : 3 * 90;
    const dy = Q ? 0.22 : 0.4;
    const NY = Math.ceil((LOC + RUNOUT) / dy) + 1;
    const pos = new Float32Array(NA * NY * 3);
    const idx = [];
    for (let j = 0; j < NY; j++) {
      const y = Math.min(j * dy, LOC + RUNOUT);
      let k = 1;
      if (y > LOC) { const s = (y - LOC) / RUNOUT; k = Math.cos(s * Math.PI / 2) ** 1.5; }
      const tw = y * twistRate;
      for (let i = 0; i < NA; i++) {
        const th = (i / NA) * Math.PI * 2;
        const local = tw - th;
        let r = sectionR(local, k);
        const per = (2 * Math.PI) / FL;
        const u = (((local % per) + per) % per) / per;
        if (y < LOC && (u > 0.8 || u < 0.03)) {
          const fl = Math.floor((((local % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / per);
          const ph = (y / 2.1 + fl / FL) % 1;
          const wave = Math.max(0, Math.sin(ph * Math.PI * 2)) ** 3;
          r -= 0.42 * wave * (u > 0.8 ? (u - 0.8) / 0.2 : 1);
        }
        if (y < 0.5) r -= (0.5 - y) * 0.6;
        const o = (j * NA + i) * 3;
        pos[o] = r * Math.cos(th); pos[o + 1] = y; pos[o + 2] = -r * Math.sin(th);
      }
    }
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NA; i++) {
      const a = j * NA + i, b = j * NA + ((i + 1) % NA), c = (j + 1) * NA + i, d = (j + 1) * NA + ((i + 1) % NA);
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat.coat); m.castShadow = true; m.receiveShadow = true;
    const capPos = [0, 0.35, 0], capIdx = [];
    for (let i = 0; i < NA; i++) { const th = (i / NA) * Math.PI * 2; const r = sectionR(-th, 1) - 0.3; capPos.push(r * Math.cos(th), 0, -r * Math.sin(th)); }
    for (let i = 0; i < NA; i++) capIdx.push(0, 1 + ((i + 1) % NA), 1 + i);
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3)); cg.setIndex(capIdx); cg.computeVertexNormals();
    const cap = new THREE.Mesh(cg, mat.coat); cap.castShadow = true;
    const g = new THREE.Group(); g.add(m, cap); return g;
  }
  function buildEndMill() {
    const g = new THREE.Group();
    g.add(buildFlutes());
    const y0 = LOC + RUNOUT;
    // a short neck relief, then the ground shank with its laser mark
    g.add(lathe([[[R, y0], [R - 0.18, y0 + 0.6]], [[R - 0.18, y0 + 0.6], [R - 0.18, y0 + 2.4]], [[R - 0.18, y0 + 2.4], [R, y0 + 3.0]]], mat.carbide));
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(R, R, OAL - y0 - 3.8, SEG, 1, true), mat.shank);
    sh.position.y = y0 + 3.0 + (OAL - y0 - 3.8) / 2; sh.castShadow = true;
    g.add(sh);
    g.add(lathe([[[R, OAL - 0.8], [R - 0.8, OAL]], [[R - 0.8, OAL], [0.001, OAL]]], mat.carbide));
    return g;
  }

  // ---------- a 1/4" 90-degree carbide spot drill, used to engrave (tool frame: y=0 at the point) ----------
  function buildSpotDrill() {
    const Rs = 3.175, LF = 9.5, RUN = 1.6, OALs = 50.8, per = Math.PI, tw = Math.tan((18 * Math.PI) / 180) / Rs;
    const secR = (th) => {
      const u = (((th % per) + per) % per) / per;
      if (u < 0.4) return Rs - 0.03 * (u / 0.4);
      const k = (u - 0.4) / 0.6;
      return Rs - (Rs - 0.34 * Rs) * Math.sin(Math.PI * Math.pow(k, 0.85));
    };
    const NA = Q ? 2 * 120 : 2 * 72, dy = Q ? 0.12 : 0.22, NY = Math.ceil((LF + RUN) / dy) + 1;
    const pos = new Float32Array(NA * NY * 3), idx = [];
    for (let j = 0; j < NY; j++) {
      const y = Math.min(j * dy, LF + RUN);
      const k = y > LF ? Math.cos(((y - LF) / RUN) * Math.PI / 2) ** 1.5 : 1;
      for (let i = 0; i < NA; i++) {
        const th = (i / NA) * Math.PI * 2;
        let r = Rs - (Rs - secR(y * tw - th)) * k;
        r = Math.min(r, y * 1.0 + 0.04);                  // the 90-degree point
        const o = (j * NA + i) * 3; pos[o] = r * Math.cos(th); pos[o + 1] = y; pos[o + 2] = -r * Math.sin(th);
      }
    }
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NA; i++) { const a = j * NA + i, b = j * NA + ((i + 1) % NA), c = (j + 1) * NA + i, d = (j + 1) * NA + ((i + 1) % NA); idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, mat.carbide); m.castShadow = true; g.add(m);
    const y0 = LF + RUN;
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(Rs, Rs, OALs - y0 - 0.6, SEG, 1, true), mat.carbide);
    sh.position.y = y0 + (OALs - y0 - 0.6) / 2; sh.castShadow = true; g.add(sh);
    g.add(lathe([[[Rs, OALs - 0.6], [Rs - 0.6, OALs]], [[Rs - 0.6, OALs], [0.001, OALs]]], mat.carbide));
    return g;
  }

  // ---------- holder (holder frame: y=0 at the nose face, gauge line at y=70) ----------
  function buildHolder() {
    const g = new THREE.Group();
    // nose: M40 x 1.5 thread the nut screws onto, then the body
    g.add(lathe([[[16.9, 0], [19.4, 0]], threadRun(20.0, 19.2, 0.6, 18.6, 1.5), [[19.2, 18.6], [20.2, 21.0]]], mat.thread));
    g.add(lathe([[[20.2, 21.0], [21.6, 22.6]], [[21.6, 22.6], [22.6, 23.6]]], mat.holder));
    g.add(lathe([[[23.0, 23.6], [23.0, 49.0]]], mat.holderBody));
    g.add(lathe([
      [[23.0, 49.0], ...arc(26.0, 49.0, 3.0, Math.PI, Math.PI * 0.5, 10).slice(1)],
      [[26.0, 52.0], [28.6, 52.0]], [[28.6, 52.0], [29.4, 52.8]], [[29.4, 52.8], [29.4, 54.1]],
    ], mat.holder));
    // the 8-degree collet seat inside the nose, and the shank bore behind it
    const m8 = Math.tan((8 * Math.PI) / 180);
    g.add(lathe([[[16.9, 0], [16.9 - m8 * 32, 32]], [[16.9 - m8 * 32, 32], [6.5, 33.5]], [[6.5, 33.5], [6.5, 62]]], mat.bore));
    // flange with V-groove and two drive slots
    const flangeOuter = [
      [[29.4, 54.1], [31.0, 54.1]], [[31.0, 54.1], [31.75, 54.85]], [[31.75, 54.85], [31.75, 59.2]],
      [[31.75, 59.2], [28.4, 62.0]], [[28.4, 62.0], [31.75, 64.8]], [[31.75, 64.8], [31.75, 69.2]],
      [[31.75, 69.2], [31.0, 70.0]], [[31.0, 70.0], [22.4, 70.0]],
    ];
    const slotHalf = 0.27;
    for (const c of [0, Math.PI]) {
      g.add(lathe(flangeOuter, mat.holder, Math.round(SEG / 2), c + slotHalf, Math.PI - 2 * slotHalf));
      g.add(lathe([[[23.8, 62.0], [23.8, 70.0]]], mat.holderDark, 16, c - slotHalf, 2 * slotHalf));
    }
    const wallShape = new THREE.Shape();
    const wallPts = [[23.8, 62.0], [28.4, 62.0], [31.75, 64.8], [31.75, 69.2], [31.0, 70.0], [23.8, 70.0]];
    wallShape.moveTo(wallPts[0][0], wallPts[0][1]); for (const p of wallPts.slice(1)) wallShape.lineTo(p[0], p[1]);
    const wallGeo = new THREE.ShapeGeometry(wallShape);
    for (const c of [0, Math.PI]) for (const s of [-1, 1]) { const w = new THREE.Mesh(wallGeo, mat.holderDark); w.rotation.y = c + s * slotHalf; g.add(w); }
    for (const c of [0, Math.PI]) {
      g.add(lathe([[[31.75, 54.85], [31.75, 59.2]], [[31.75, 59.2], [28.4, 62.0]]], mat.holder, SEG, c - slotHalf, 2 * slotHalf));
      g.add(lathe([[[29.4, 54.1], [31.0, 54.1]], [[31.0, 54.1], [31.75, 54.85]]], mat.holder, SEG, c - slotHalf, 2 * slotHalf));
    }
    // 7/24 taper, with the pull-stud thread bore at its end
    const tl = 68.25, rs = 22.225 - (tl * 7) / 24 / 2;
    g.add(lathe([[[22.225, 70.0], [rs + 0.6, 70 + tl - 0.6]], [[rs + 0.6, 70 + tl - 0.6], [rs, 70 + tl]], [[rs, 70 + tl], [8.6, 70 + tl]]], mat.holder));
    g.add(lathe([[[8.6, 70 + tl], [8.0, 70 + tl - 1.2]], [[8.0, 70 + tl - 1.2], [8.0, 70 + tl - 18]]], mat.bore));
    return g;
  }

  function buildPullStud() {
    // stud frame: y=0 at its flange face; the 5/8-11 thread goes into the holder (negative y)
    const g = lathe([
      threadRun(7.9, 6.75, -21.5, -0.8, 2.31),
      [[6.75, -0.8], [6.75, 0]],
      [[2.6, 0], [11.25, 0]],
      [[11.25, 0], [11.25, 3.8]], [[11.25, 3.8], [10.5, 4.6]], [[10.5, 4.6], [6.6, 4.6]], [[6.6, 4.6], [6.6, 11.6]],
      [[6.6, 11.6], [9.4, 14.4]], [[9.4, 14.4], [9.4, 18.9]], [[9.4, 18.9], [8.2, 20.1]], [[8.2, 20.1], [2.6, 20.1]],
    ], mat.stud);
    g.add(lathe([[[2.6, 20.1], [2.6, -21.5]]], mat.bore));        // through-coolant hole
    g.add(lathe([[[6.75, -21.5], [2.6, -21.5]]], mat.stud));
    return g;
  }

  function buildNut() {
    // ER32 nut, y=0 at its front face: four spanner slots cut into the rim, internal thread behind
    const g = new THREE.Group();
    g.add(lathe([[[16.2, 0], [23.6, 0]], [[23.6, 0], [25.0, 1.4]], [[16.2, 0], [14.0, 3.2]], [[14.0, 3.2], [17.0, 6.0]]], mat.nut));
    const notch = 0.14;   // ~3.5 mm spanner slots, six around the rim
    const NN = 6;
    for (let i = 0; i < NN; i++) {
      const c = (i / NN) * Math.PI * 2 + Math.PI / NN;
      g.add(lathe([[[25.0, 1.4], [25.0, 21.0]]], mat.nut, Math.round(SEG / NN), c + notch, (Math.PI * 2) / NN - 2 * notch));
      g.add(sector([[22.4, 4.0], [22.4, 18.4], [25.0, 18.4], [25.0, 4.0]], c - notch, c + notch, mat.holderDark, 8));
      g.add(lathe([[[25.0, 1.4], [25.0, 4.0]], [[25.0, 18.4], [25.0, 21.0]]], mat.nut, 8, c - notch, 2 * notch));
    }
    g.add(lathe([[[25.0, 21.0], [23.6, 22.5]], [[23.6, 22.5], [20.6, 22.5]]], mat.nut));
    g.add(lathe([threadRun(20.6, 19.9, 7.0, 22.5, 1.5)], mat.bore));
    return g;
  }

  function buildCollet() {
    // ER32 collet for a 1/2" shank, y=0 at its front face. Eight slots, closed by rings at each end.
    const m8 = Math.tan((8 * Math.PI) / 180);
    const g = new THREE.Group();
    const rBack = 16.5 - m8 * 31.6;
    const outer = [[13.2, 0], [16.3, 4.6], [15.2, 5.6], [15.2, 7.2], [16.5, 8.4], [rBack, 40.0]];
    // end rings
    const rb = cutter === 'spot' ? 3.3 : 6.6;
    g.add(lathe([[[rb, 0], [13.2, 0]], [[13.2, 0], [16.3, 4.6]], [[16.3, 4.6], [15.2, 5.6]]], mat.carbide));
    g.add(lathe([[[rBack + m8 * 3.2, 36.8], [rBack, 40.0]], [[rBack, 40.0], [rb, 40.0]]], mat.carbide));
    // eight fingers between the rings, each a sector with a 0.9 mm gap on either side
    const slot = 0.1;   // ~1.6 mm slits, wide enough to read
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2 + slot, a1 = ((i + 1) / 8) * Math.PI * 2 - slot;
      g.add(lathe([[[15.2, 5.6], [15.2, 7.2]], [[15.2, 7.2], [16.5, 8.4]], [[16.5, 8.4], [rBack + m8 * 3.2, 36.8]]], mat.carbide, 18, a0, a1 - a0));
      g.add(lathe([[[rb, 5.6], [rb, 36.8]]], mat.bore, 18, a0, a1 - a0));
    }
    // the slots read dark from outside
    g.add(lathe([[[14.6, 5.6], [14.6, 36.8]]], new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.DoubleSide }), 64));
    void outer;
    return g;
  }

  // ---------- workpiece in a 6" vise, on the table ----------
  function buildWorkpiece() {
    const g = new THREE.Group();
    const H = 34, DEPTH = 6.0, W = 70, L0 = -150, L1 = 70;
    const low = new THREE.Mesh(new THREE.BoxGeometry(L1 - L0, H - DEPTH, W), mat.steelSide);
    low.position.set((L0 + L1) / 2, -(H - DEPTH) / 2, 0); low.receiveShadow = true; low.castShadow = true;
    g.add(low);
    const s = new THREE.Shape();
    s.moveTo(L0, -W / 2); s.lineTo(L1, -W / 2); s.lineTo(L1, W / 2); s.lineTo(L0, W / 2);
    s.lineTo(L0, R); s.lineTo(0, R); s.absarc(0, 0, R, Math.PI / 2, -Math.PI / 2, true); s.lineTo(L0, -R); s.lineTo(L0, -W / 2);
    const top = new THREE.ExtrudeGeometry(s, { depth: DEPTH - 0.6, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelOffset: -0.6, bevelSegments: 2, curveSegments: 64 });
    top.rotateX(Math.PI / 2); top.translate(0, DEPTH - 0.6, 0);
    const topMesh = new THREE.Mesh(top, [mat.steelTop, mat.steelSide]); topMesh.receiveShadow = true; topMesh.castShadow = true;
    g.add(topMesh);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(-L0, 2 * R), mat.steelCut);
    floor.rotation.x = -Math.PI / 2; floor.position.set(L0 / 2, 0.01, 0); floor.receiveShadow = true;
    g.add(floor);
    if (vise) {
      // jaws grip the block's long faces (z = +/- W/2); body and ways below; the table under it
      const jawH = 44, jawT = 22, bodyH = 70, len = 240;
      const fixed = new THREE.Mesh(new THREE.BoxGeometry(len * 0.62, jawH, jawT), mat.vise);
      fixed.position.set(-40, -H + jawH / 2 + 8, -W / 2 - jawT / 2); g.add(fixed);
      const moving = fixed.clone(); moving.position.z = W / 2 + jawT / 2; g.add(moving);
      for (const z of [-W / 2 - 1.2, W / 2 + 1.2]) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(len * 0.62 - 4, 30, 2.4), mat.viseGround);
        plate.position.set(-40, -H + 30 / 2 + 8 + 10, z); g.add(plate);
      }
      const body = new THREE.Mesh(new THREE.BoxGeometry(len, bodyH, W + 2 * jawT + 30), mat.vise);
      body.position.set(-40, -H - bodyH / 2 + 8, 0); g.add(body);
      const ways = new THREE.Mesh(new THREE.BoxGeometry(len - 10, 3, W - 6), mat.viseGround);
      ways.position.set(-40, -H + 8 + 1.5, 0); g.add(ways);
      const table = new THREE.Mesh(new THREE.BoxGeometry(400, 40, 240), mat.viseGround);
      table.position.set(-40, -H - bodyH + 8 - 20, 0); table.receiveShadow = true; g.add(table);
      for (let k = -2; k <= 2; k++) {
        const slotM = new THREE.Mesh(new THREE.BoxGeometry(400, 1, 14), mat.bore);
        slotM.position.set(-40, -H - bodyH + 8 + 0.6, k * 46); g.add(slotM);
      }
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    }
    return g;
  }

  // ---------- chips ----------
  function ribbon(turns, r0, r1, pitch, width, NU = 34) {
    const pos = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, a = u * Math.PI * 2 * turns, rad = r0 + (r1 - r0) * u;
      const cx = rad * Math.cos(a), cz = rad * Math.sin(a), cy = u * pitch * turns, tw = 0.25 * Math.sin(u * 3.1);
      pos.push(cx - tw * Math.cos(a) * width, cy - width / 2, cz - tw * Math.sin(a) * width);
      pos.push(cx + tw * Math.cos(a) * width, cy + width / 2, cz + tw * Math.sin(a) * width);
    }
    for (let i = 0; i < NU; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals(); geo.translate(0, -pitch * turns / 2, 0);
    return geo;
  }
  const chipGeos = [ribbon(0.85, 1.9, 1.5, 0.0, 1.3), ribbon(2.1, 2.1, 0.8, 0.12, 1.0), ribbon(2.6, 1.3, 1.1, 1.05, 0.9), ribbon(1.4, 2.6, 2.0, 0.4, 1.6)];
  const chipMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.24, side: THREE.DoubleSide, iridescence: 0.3, iridescenceIOR: 1.9, iridescenceThicknessRange: [240, 320] });
  const TEMPER = [[0xa9acb0, 0.42], [0xdcb76c, 0.17], [0xb07440, 0.13], [0x7a5698, 0.1], [0x3f66b4, 0.18]];
  const pickTemper = (r) => { let p = r(), acc = 0; for (const [h, w] of TEMPER) { acc += w; if (p <= acc) return h; } return TEMPER[0][0]; };
  const CHIPS_PER = chips ? (Q ? 40 : 18) : 0;
  const chipMeshes = chipGeos.map((geo) => { const im = new THREE.InstancedMesh(geo, chipMat, Math.max(1, CHIPS_PER)); im.frustumCulled = false; return im; });
  const chipSeeds = [];
  {
    const r = rng(seed); const col = new THREE.Color();
    for (let k = 0; k < chipMeshes.length; k++) for (let i = 0; i < CHIPS_PER; i++) {
      chipMeshes[k].setColorAt(i, col.setHex(pickTemper(r)).convertSRGBToLinear());
      chipSeeds.push({ mesh: k, i, phase: r(), ang: -Math.PI / 2 + (r() - 0.6) * 0.8, h: 2.5 + r() * 3.5, vt: 14 + r() * 34, vu: 22 + r() * 40, vr: 1 + r() * 7, life: 1.4 + r() * 1.8, size: 0.5 + r() * 0.6,
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28)), axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: 1.5 + r() * 5 });
    }
    chipMeshes.forEach((m) => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  }
  const CYCLE = 4.8;

  // ---------- assembly ----------
  const root = new THREE.Group();
  const spinner = new THREE.Group();
  root.add(spinner);
  const STICK = cutter === 'spot' ? 21.0 : 38.0;
  const parts = { endmill: cutter === 'spot' ? buildSpotDrill() : buildEndMill(), collet: buildCollet(), nut: buildNut(), holder: buildHolder(), stud: buildPullStud() };
  const base = { endmill: 0, collet: STICK - 0.6, nut: STICK, holder: STICK, stud: STICK + 70 + 68.25 };
  // exploded: about 15 mm of air between neighbours, in the order they come apart
  const explodeBy = { endmill: -145, collet: -54, nut: -92, holder: 0, stud: 36 };
  for (const k of Object.keys(parts)) { spinner.add(parts[k]); parts[k].position.y = base[k]; }

  const work = withWork ? buildWorkpiece() : new THREE.Group();
  if (withWork) {
    const r = rng(311); const n = Q ? 60 : 24;
    const col = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), m4 = new THREE.Matrix4();
    chipGeos.forEach((geo) => {
      const im = new THREE.InstancedMesh(geo, chipMat, n);
      for (let i = 0; i < n; i++) {
        const inSlot = r() < 0.55;
        const x = inSlot ? -8 - r() * 120 : -40 + r() * 70;
        const z = inSlot ? (r() - 0.5) * 9 : (r() < 0.5 ? -1 : 1) * (8 + r() * 26);
        e.set((r() - 0.5) * 1.2 + Math.PI / 2 * (r() < 0.5 ? 1 : 0), r() * 6.28, (r() - 0.5) * 1.2); q.setFromEuler(e);
        const s = 0.5 + r() * 0.5;
        m4.compose(v.set(x, inSlot ? 0.6 : 6.6, z), q, sc.set(s, s, s)); im.setMatrixAt(i, m4);
        im.setColorAt(i, col.setHex(pickTemper(r)).convertSRGBToLinear());
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.receiveShadow = true;
      work.add(im);
    });
  }
  const chipRoot = new THREE.Group();
  if (CHIPS_PER) chipMeshes.forEach((m) => chipRoot.add(m));

  // chips packed into the flute valleys (the first likely cause), shown with st.packed 0..1
  const packedMeshes = [], packedSeeds = [];
  if (packed) {
    const r = rng(509); const per = (2 * Math.PI) / FL; const col = new THREE.Color();
    const n = Q ? 26 : 14;
    chipGeos.forEach((geo, k) => {
      const im = new THREE.InstancedMesh(geo, chipMat, n); im.frustumCulled = false; im.castShadow = true;
      for (let i = 0; i < n; i++) {
        const y = 1.5 + r() * (LOC - 3), f = Math.floor(r() * FL);
        const th = y * twistRate - (f + 0.3 + (r() - 0.5) * 0.18) * per;
        const rad = RCORE + 0.9 + r() * 0.9;
        packedSeeds.push({ k, i, p: new THREE.Vector3(rad * Math.cos(th), y, -rad * Math.sin(th)), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28)), s: 0.42 + r() * 0.36, d: r() * 0.5 });
        im.setColorAt(i, col.setHex(pickTemper(r)).convertSRGBToLinear());
      }
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      packedMeshes.push(im);
      parts.endmill.add(im);
    });
  }

  // ---------- state ----------
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const st = { t: 0, spin: 0.55, holdAt: null, explode: 0, chipFade: 1, packed: 0 };
  function updatePacked() {
    if (!packedMeshes.length) return;
    for (const c of packedSeeds) {
      const a = clamp01((st.packed - c.d * 0.6) / 0.4);
      tmpM.compose(c.p, c.q, tmpS.setScalar(c.s * smooth(a) + 1e-4));
      packedMeshes[c.k].setMatrixAt(c.i, tmpM);
    }
    packedMeshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; m.visible = st.packed > 0.001; });
  }

  function updateChips() {
    if (!CHIPS_PER) return;
    const visibleBefore = st.holdAt == null ? Infinity : st.holdAt;
    for (const c of chipSeeds) {
      const m = chipMeshes[c.mesh];
      const birth = Math.floor((st.t - c.phase * CYCLE) / CYCLE) * CYCLE + c.phase * CYCLE;
      const age = st.t - birth;
      if (!(age >= 0 && age < c.life && birth <= visibleBefore && st.chipFade > 0.001)) { tmpM.makeScale(0, 0, 0); m.setMatrixAt(c.i, tmpM); continue; }
      const a = c.ang, px = R * Math.cos(a), pz = -R * Math.sin(a), tx = Math.sin(a), tz = Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
      const x = px + (tx * c.vt + rx * c.vr) * age, y = c.h + c.vu * age - 29 * age * age, z = pz + (tz * c.vt + rz * c.vr) * age;
      tmpQ2.setFromAxisAngle(c.axis, c.spin * age); tmpQ.copy(c.q).premultiply(tmpQ2);
      const life01 = age / c.life;
      const s = c.size * (life01 < 0.06 ? life01 / 0.06 : 1) * (life01 > 0.85 ? (1 - life01) / 0.15 : 1) * st.chipFade;
      tmpM.compose(tmpV.set(x, Math.max(y, -60), z), tmpQ, tmpS.set(s, s, s)); m.setMatrixAt(c.i, tmpM);
    }
    chipMeshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  }

  function update(next = {}) {
    Object.assign(st, next);
    spinner.rotation.y = -st.spin * st.t * Math.PI * 2;
    const e = smooth(st.explode);
    for (const k of Object.keys(parts)) parts[k].position.y = base[k] + explodeBy[k] * e;
    updateChips();
    updatePacked();
  }

  // named points on parts, in the rig's root frame, on the side facing +z
  const anchors = {
    edge: ['endmill', [R * 0.9, 9, R * 0.3]], flutes: ['endmill', [R * 0.95, 14, 0]], endmill: ['endmill', [R, 12, 0]], shank: ['endmill', [R, 52, 0]],
    collet: ['collet', [14, 20, 0]], nut: ['nut', [25, 11, 0]], holder: ['holder', [23, 36, 0]], flange: ['holder', [31.75, 62, 0]],
    taper: ['holder', [17, 104, 0]], seat: ['holder', [16.5, 2, 0]], stud: ['stud', [9.4, 16, 0]], studThread: ['stud', [7.9, -10, 0]],
  };
  const out = new THREE.Vector3();
  function worldAnchor(name, target = out) {
    const [pk, v] = anchors[name];
    root.updateMatrixWorld();
    target.set(v[0], v[1] + parts[pk].position.y, v[2]);
    return target.applyMatrix4(root.matrixWorld);
  }
  // world points along the axis at a part's ends (for dimension lines)
  function axisPoint(y, target = new THREE.Vector3()) { root.updateMatrixWorld(); return target.set(0, y, 0).applyMatrix4(root.matrixWorld); }

  update();
  return { root, spinner, parts, base, explodeBy, work, chipRoot, mat, update, worldAnchor, axisPoint, anchors, R, OAL, STICK, CYCLE, st };
}
