// tool3d.js: T02, a 1/2" three-flute roughing end mill in a CAT40 ER32 holder,
// built from real dimensions (mm) as lathe profiles and a twisted flute section.
// Used by the site (live) and by the HyperFrames film (seeked), so every visible
// thing is a function of the state passed to update(). No clocks, no unseeded random.

export function createTool3D(THREE, opts = {}) {
  const {
    canvas,
    quality = 'high',          // 'high' | 'low'
    background = 0x0a0a0b,
    preserveDrawingBuffer = false,
  } = opts;

  const Q = quality === 'high';
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, preserveDrawingBuffer,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);

  // ---------- seeded random (mulberry32) ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- studio environment: black room, strip boxes, one top softbox ----------
  function buildStudio() {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x000000);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const room = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide }));
    room.scale.set(40, 24, 40);
    env.add(room);
    const panel = (w, h, x, y, z, ry, rx, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.y = ry; m.rotation.x = rx || 0;
      env.add(m);
      return m;
    };
    // tall strip lights left and right (long vertical highlights on turned parts)
    panel(1.4, 16, -11, 2, 4, Math.PI / 2.6, 0, 14);
    panel(1.0, 16, 12, 1, -2, -Math.PI / 2.2, 0, 9);
    // rim strip behind
    panel(0.6, 14, 3, 1, -16, 0, 0, 6);
    // overhead softbox, angled
    panel(12, 6, 0, 11.5, 2, 0, Math.PI / 2, 3.2);
    // faint floor bounce card in front
    panel(16, 2, 0, -9, 10, 0, -Math.PI / 3, 0.35);
    return env;
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(buildStudio(), 0.015);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 1.0;
  pmrem.dispose();

  // key light for shadows on the workpiece
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-120, 220, 140);
  key.castShadow = true;
  key.shadow.mapSize.set(Q ? 2048 : 1024, Q ? 2048 : 1024);
  key.shadow.camera.left = -120; key.shadow.camera.right = 120;
  key.shadow.camera.top = 120; key.shadow.camera.bottom = -120;
  key.shadow.camera.near = 10; key.shadow.camera.far = 600;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(160, 60, -200);
  scene.add(rim);

  // ---------- materials (neutral: the world is black and white) ----------
  const markCanvas = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  };
  const mat = {
    holder: new THREE.MeshPhysicalMaterial({ color: 0xb9bcc0, metalness: 1, roughness: 0.24, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
    holderDark: new THREE.MeshPhysicalMaterial({ color: 0x8b8e92, metalness: 1, roughness: 0.38 }),
    nut: new THREE.MeshPhysicalMaterial({ color: 0xc4c6c9, metalness: 1, roughness: 0.2 }),
    stud: new THREE.MeshPhysicalMaterial({ color: 0x9da0a4, metalness: 1, roughness: 0.3 }),
    carbide: new THREE.MeshPhysicalMaterial({ color: 0xa8aaad, metalness: 1, roughness: 0.18 }),
    coat: new THREE.MeshPhysicalMaterial({ color: 0x3a3b3e, metalness: 0.9, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    steelTop: null,
    steelSide: new THREE.MeshPhysicalMaterial({ color: 0x55585c, metalness: 0.9, roughness: 0.5 }),
    steelCut: new THREE.MeshPhysicalMaterial({ color: 0xb4b7bb, metalness: 1, roughness: 0.2 }),
  };

  // face-milled top: overlapping arcs from a 3" face mill, as colour and roughness
  const faceTex = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#8f9296'; g.fillRect(0, 0, c.width, c.height);
    const r = rng(7);
    // passes run along x; each pass is a fan of arcs
    for (let pass = 0; pass < 3; pass++) {
      const cy = (pass + 0.5) * (c.height / 2.6) - 40;
      for (let x = -400; x < c.width + 400; x += 7) {
        g.strokeStyle = `rgba(${200 + r() * 40},${200 + r() * 40},${205 + r() * 40},${0.05 + r() * 0.09})`;
        g.lineWidth = 1 + r() * 1.6;
        g.beginPath(); g.arc(x, cy, 380, -0.9, 0.9); g.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    tex.repeat.set(1 / 220, 1 / 70); tex.offset.set(150 / 220, 35 / 70);
    return tex;
  })();
  mat.steelTop = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: faceTex, metalness: 1, roughness: 0.3 });

  // collet slots as dark lines in the colour map
  const colletTex = markCanvas(1024, 256, (g, w, h) => {
    g.fillStyle = '#d4d6d9'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#121214';
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * w;
      const fromFront = i % 2 === 0;
      g.fillRect(x - 3, fromFront ? 0 : h * 0.12, 6, h * 0.88);
    }
  });
  mat.collet = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: colletTex, metalness: 1, roughness: 0.26 });

  // ER32 nut rim: four spanner slots and two turned grooves
  const nutTex = markCanvas(2048, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#c9cbce'); grd.addColorStop(1, '#bfc1c4');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7b7e82'; g.fillRect(0, h * 0.17, w, 3); g.fillRect(0, h * 0.83, w, 3);
    for (let i = 0; i < 4; i++) {
      const x = ((i + 0.5) / 4) * w;
      const sw = w * 0.036;
      g.fillStyle = '#0c0c0d'; g.fillRect(x - sw / 2, h * 0.2, sw, h * 0.6);
      g.fillStyle = '#4a4c50'; g.fillRect(x - sw / 2, h * 0.2, 3, h * 0.6); g.fillRect(x + sw / 2 - 3, h * 0.2, 3, h * 0.6);
    }
  });
  mat.nutRim = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: nutTex, metalness: 1, roughness: 0.22 });

  // laser marks: on the holder body ("T02") and the end mill shank
  const holderMarkTex = markCanvas(2048, 256, (g, w, h) => {
    g.fillStyle = '#d0d2d5'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b2c2f';
    g.font = '600 128px "Hubot Sans", "Mona Sans", Arial, sans-serif';
    g.textBaseline = 'middle';
    g.fillText('T02', w * 0.06, h * 0.52);
    g.font = '500 54px "Hubot Sans", "Mona Sans", Arial, sans-serif';
    g.fillText('CAT40  ER32  2.75', w * 0.21, h * 0.52);
    g.fillText('T02', w * 0.56, h * 0.52);
    g.fillText('CAT40  ER32  2.75', w * 0.66, h * 0.52);
  });
  holderMarkTex.wrapS = THREE.RepeatWrapping;
  mat.holderBody = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: holderMarkTex, metalness: 1, roughness: 0.25, clearcoat: 0.3, clearcoatRoughness: 0.2 });

  const shankMarkTex = markCanvas(1024, 256, (g, w, h) => {
    g.fillStyle = '#c9cbce'; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w * 0.62, h * 0.5); g.rotate(-Math.PI / 2);
    g.fillStyle = '#3a3b3f';
    g.font = '500 30px "Hubot Sans", "Mona Sans", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('1/2  3FL  ROUGH', 0, 0);
    g.restore();
  });
  mat.shank = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: shankMarkTex, metalness: 1, roughness: 0.17 });

  // ---------- geometry helpers ----------
  const SEG = Q ? 160 : 96;
  // A profile is a list of runs; each run is [[r,y],...] and gets its own lathe so corners stay crisp.
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
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      out.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
    }
    return out;
  };

  // ---------- the end mill (tool frame: y=0 at the tip, +y toward the shank) ----------
  const D = 12.7, R = D / 2, LOC = 25.4, RUNOUT = 4.5, OAL = 76.2;
  const HELIX = (38 * Math.PI) / 180;
  const twistRate = Math.tan(HELIX) / R;        // rad per mm
  const FL = 3;
  const RCORE = 0.57 * R;

  // radius of the flute section at local angle th (radians), depth factor k in [0,1]
  function sectionR(th, k) {
    const per = (2 * Math.PI) / FL;
    let u = (((th % per) + per) % per) / per;      // 0..1 within one tooth
    let r;
    if (u < 0.045) {                                // rake face, steep
      const s = u / 0.045;
      r = R - (R - 0.74 * R) * Math.pow(s, 0.7);
    } else if (u < 0.56) {                          // gullet
      const s = (u - 0.045) / (0.56 - 0.045);
      const dip = Math.sin(Math.PI * Math.pow(s, 0.85));
      const base = 0.74 * R + (0.93 * R - 0.74 * R) * s;
      r = base - (base - RCORE) * dip * 0.98;
    } else if (u < 0.86) {                          // heel, clearance
      const s = (u - 0.56) / 0.3;
      r = 0.93 * R + (R - 0.025 - 0.93 * R) * (1 - Math.pow(1 - s, 2));
    } else {                                        // margin / land
      r = R - 0.025 * (1 - (u - 0.86) / 0.14);
    }
    return R - (R - r) * k;
  }

  function buildFlutes() {
    const NA = Q ? 3 * 150 : 3 * 90;
    const dy = Q ? 0.22 : 0.4;
    const NY = Math.ceil((LOC + RUNOUT) / dy) + 1;
    const pos = new Float32Array(NA * NY * 3);
    const uv = new Float32Array(NA * NY * 2);
    const idx = [];
    for (let j = 0; j < NY; j++) {
      const y = Math.min(j * dy, LOC + RUNOUT);
      // depth factor: full flute up to LOC, then run-out curve
      let k = 1;
      if (y > LOC) { const s = (y - LOC) / RUNOUT; k = Math.cos(s * Math.PI / 2) ** 1.5; }
      const tw = y * twistRate;
      for (let i = 0; i < NA; i++) {
        const th = (i / NA) * Math.PI * 2;
        const local = tw - th;                 // mirrored: cutting edge leads when turning clockwise from above
        let r = sectionR(local, k);
        // roughing chipbreakers along the cutting edges
        const per = (2 * Math.PI) / FL;
        const u = (((local % per) + per) % per) / per;
        if (y < LOC && (u > 0.8 || u < 0.03)) {
          const fl = Math.floor((((local % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / per);
          const ph = (y / 2.1 + fl / FL) % 1;
          const wave = Math.max(0, Math.sin(ph * Math.PI * 2)) ** 3;
          const w = u > 0.8 ? (u - 0.8) / 0.2 : 1;
          r -= 0.42 * wave * w;
        }
        // tiny corner break at the tip
        if (y < 0.5) r -= (0.5 - y) * 0.6;
        // wear on tooth 0: a chipped corner and a dulled edge for the first few mm
        {
          const per2 = (2 * Math.PI) / FL;
          const lw = ((local % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          const u2 = (lw % per2) / per2;
          if (lw < per2 * 1.0 && (u2 > 0.9 || u2 < 0.06) && y < 3.2) {
            const d = (3.2 - y) / 3.2;
            r -= 0.9 * d * d * (u2 > 0.9 ? (u2 - 0.9) / 0.1 : 1);
          }
        }
        const o = (j * NA + i) * 3;
        pos[o] = r * Math.cos(th); pos[o + 1] = y; pos[o + 2] = -r * Math.sin(th);
        uv[(j * NA + i) * 2] = i / NA; uv[(j * NA + i) * 2 + 1] = y / (LOC + RUNOUT);
      }
    }
    for (let j = 0; j < NY - 1; j++) {
      for (let i = 0; i < NA; i++) {
        const a = j * NA + i, b = j * NA + ((i + 1) % NA), c = (j + 1) * NA + i, d = (j + 1) * NA + ((i + 1) % NA);
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat.coat);
    m.castShadow = true; m.receiveShadow = true;

    // end face: the section at y=0, fanned from the centre with a slight dish
    const capPos = [0, 0.35, 0];
    const capIdx = [];
    for (let i = 0; i < NA; i++) {
      const th = (i / NA) * Math.PI * 2;
      const r = sectionR(-th, 1) - 0.3;
      capPos.push(r * Math.cos(th), 0, -r * Math.sin(th));
    }
    for (let i = 0; i < NA; i++) capIdx.push(0, 1 + ((i + 1) % NA), 1 + i);
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3));
    cg.setIndex(capIdx);
    cg.computeVertexNormals();
    const cap = new THREE.Mesh(cg, mat.coat);
    cap.castShadow = true;

    const g = new THREE.Group();
    g.add(m, cap);
    return g;
  }

  function buildEndMill() {
    const g = new THREE.Group();
    g.add(buildFlutes());
    // shank, with the laser mark
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(R, R, OAL - (LOC + RUNOUT) - 0.8, SEG, 1, true), mat.shank);
    sh.position.y = (LOC + RUNOUT) + (OAL - (LOC + RUNOUT) - 0.8) / 2;
    sh.castShadow = true;
    g.add(sh);
    // back chamfer and end
    g.add(lathe([[[R, OAL - 0.8], [R - 0.8, OAL]], [[R - 0.8, OAL], [0.001, OAL]]], mat.carbide));
    return g;
  }

  // ---------- holder (holder frame: y=0 at the nose face, gauge line at y=70) ----------
  function buildHolder() {
    const g = new THREE.Group();
    // body from the nose to under the flange
    g.add(lathe([
      [[20.2, 21.0], [21.6, 22.6]],
      [[21.6, 22.6], [22.6, 23.6]],
    ], mat.holder));
    const body = lathe([[[23.0, 23.6], [23.0, 49.0]]], mat.holderBody);
    g.add(body);
    g.add(lathe([
      [[23.0, 49.0], ...arc(26.0, 49.0, 3.0, Math.PI, Math.PI * 0.5, 10).slice(1)],
      [[26.0, 52.0], [28.6, 52.0]],
      [[28.6, 52.0], [29.4, 52.8]],
      [[29.4, 52.8], [29.4, 54.1]],
    ], mat.holder));
    // flange with V-groove and two drive slots
    const flangeOuter = [
      [[29.4, 54.1], [31.0, 54.1]],
      [[31.0, 54.1], [31.75, 54.85]],
      [[31.75, 54.85], [31.75, 59.2]],
      [[31.75, 59.2], [28.4, 62.0]],
      [[28.4, 62.0], [31.75, 64.8]],
      [[31.75, 64.8], [31.75, 69.2]],
      [[31.75, 69.2], [31.0, 70.0]],
      [[31.0, 70.0], [22.4, 70.0]],
    ];
    const slotHalf = 0.27;                               // ~16 mm wide slots at the rim
    for (const c of [0, Math.PI]) {
      const a0 = c + slotHalf, len = Math.PI - 2 * slotHalf;
      g.add(lathe(flangeOuter, mat.holder, Math.round(SEG / 2), a0, len));
      // slot floor and its walls
      g.add(lathe([[[23.8, 62.0], [23.8, 70.0]]], mat.holderDark, 16, c - slotHalf, 2 * slotHalf));
    }
    // slot walls: flat faces between the slot floor radius and the flange outline
    const wallShape = new THREE.Shape();
    const wallPts = [[23.8, 62.0], [28.4, 62.0], [31.75, 64.8], [31.75, 69.2], [31.0, 70.0], [23.8, 70.0]];
    wallShape.moveTo(wallPts[0][0], wallPts[0][1]);
    for (const p of wallPts.slice(1)) wallShape.lineTo(p[0], p[1]);
    const wallGeo = new THREE.ShapeGeometry(wallShape);
    for (const c of [0, Math.PI]) {
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(wallGeo, mat.holderDark);
        w.material.side = THREE.DoubleSide;
        w.rotation.y = c + s * slotHalf;     // shape's x axis is the radius
        g.add(w);
      }
    }
    // the slot cuts through the upper half of the flange, so fill the lower half fully
    g.add(lathe([[[31.75, 54.85], [31.75, 59.2]], [[31.75, 59.2], [28.4, 62.0]]], mat.holder, SEG, -slotHalf, 2 * slotHalf));
    g.add(lathe([[[31.75, 54.85], [31.75, 59.2]], [[31.75, 59.2], [28.4, 62.0]]], mat.holder, SEG, Math.PI - slotHalf, 2 * slotHalf));
    g.add(lathe([[[29.4, 54.1], [31.0, 54.1]], [[31.0, 54.1], [31.75, 54.85]]], mat.holder, SEG, -slotHalf, 2 * slotHalf));
    g.add(lathe([[[29.4, 54.1], [31.0, 54.1]], [[31.0, 54.1], [31.75, 54.85]]], mat.holder, SEG, Math.PI - slotHalf, 2 * slotHalf));
    // 7/24 taper
    const tl = 68.25, rs = 22.225 - (tl * 7) / 24 / 2;
    g.add(lathe([
      [[22.225, 70.0], [rs + 0.6, 70 + tl - 0.6]],
      [[rs + 0.6, 70 + tl - 0.6], [rs, 70 + tl]],
      [[rs, 70 + tl], [9.0, 70 + tl]],
    ], mat.holder));
    return g;
  }

  function buildPullStud() {
    // stud frame: y=0 at its flange face on the taper end
    return lathe([
      [[0.001, 0], [11.25, 0]],
      [[11.25, 0], [11.25, 3.8]],
      [[11.25, 3.8], [10.5, 4.6]],
      [[10.5, 4.6], [6.6, 4.6]],
      [[6.6, 4.6], [6.6, 11.6]],
      [[6.6, 11.6], [9.4, 14.4]],
      [[9.4, 14.4], [9.4, 18.9]],
      [[9.4, 18.9], [8.2, 20.1]],
      [[8.2, 20.1], [0.001, 20.1]],
    ], mat.stud);
  }

  function buildNut() {
    // nut frame: y=0 at its front face
    const g = lathe([
      [[16.2, 0], [23.6, 0]],
      [[23.6, 0], [25.0, 1.4]],
      { pts: [[25.0, 1.4], [25.0, 21.0]], mat: mat.nutRim },
      [[25.0, 21.0], [23.6, 22.5]],
      [[23.6, 22.5], [21.0, 22.5]],
      [[16.2, 0], [14.0, 3.2]],
    ], mat.nut);
    return g;
  }

  function buildCollet() {
    // collet frame: y=0 at its front face
    const m8 = Math.tan((8 * Math.PI) / 180);
    const g = lathe([[
      [13.2, 0], [16.3, 4.6],
    ], [
      [16.3, 4.6], [15.2, 5.6], [15.2, 7.2], [16.5, 8.4],
    ], [
      [16.5, 8.4], [16.5 - m8 * 31.6, 40.0],
    ], [
      [16.5 - m8 * 31.6, 40.0], [6.6, 40.0],
    ], [
      [6.6, 0.0], [13.2, 0.0],
    ]], mat.collet);
    return g;
  }

  // ---------- workpiece: steel block with a slot ending at the tool ----------
  function buildWorkpiece() {
    const g = new THREE.Group();
    const H = 34, DEPTH = 6.0, W = 70, L0 = -150, L1 = 70;
    // under the slot floor: full block
    const low = new THREE.Mesh(new THREE.BoxGeometry(L1 - L0, H - DEPTH, W), mat.steelSide);
    low.position.set((L0 + L1) / 2, -(H - DEPTH) / 2, 0);
    low.receiveShadow = true; low.castShadow = true;
    g.add(low);
    // top layer: outline with the slot notch (top view, x right, z toward camera)
    const s = new THREE.Shape();
    s.moveTo(L0, -W / 2); s.lineTo(L1, -W / 2); s.lineTo(L1, W / 2); s.lineTo(L0, W / 2);
    s.lineTo(L0, R);
    s.lineTo(0, R);
    s.absarc(0, 0, R, Math.PI / 2, -Math.PI / 2, true);
    s.lineTo(L0, -R);
    s.lineTo(L0, -W / 2);
    const top = new THREE.ExtrudeGeometry(s, { depth: DEPTH - 0.6, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelOffset: -0.6, bevelSegments: 2, curveSegments: 64 });
    top.rotateX(Math.PI / 2);         // extrude down: shape plane becomes horizontal
    top.translate(0, DEPTH - 0.6, 0);
    const topMesh = new THREE.Mesh(top, [mat.steelTop, mat.steelSide]);
    topMesh.receiveShadow = true; topMesh.castShadow = true;
    g.add(topMesh);
    // slot floor (cut surface)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(-L0, 2 * R), mat.steelCut);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(L0 / 2, 0.01, 0);
    floor.receiveShadow = true;
    g.add(floor);
    return g;
  }

  // ---------- chips: curled ribbons, mostly bare steel, some with temper colour ----------
  function ribbon(turns, r0, r1, pitch, width, NU = 34) {
    const pos = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, a = u * Math.PI * 2 * turns;
      const rad = r0 + (r1 - r0) * u;
      const cx = rad * Math.cos(a), cz = rad * Math.sin(a), cy = u * pitch * turns;
      // the ribbon's width runs along the curl axis, slightly twisted
      const tw = 0.25 * Math.sin(u * 3.1);
      pos.push(cx - tw * Math.cos(a) * width, cy - width / 2, cz - tw * Math.sin(a) * width);
      pos.push(cx + tw * Math.cos(a) * width, cy + width / 2, cz + tw * Math.sin(a) * width);
    }
    for (let i = 0; i < NU; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    geo.translate(0, -pitch * turns / 2, 0);
    return geo;
  }
  const chipGeos = [
    ribbon(0.85, 1.9, 1.5, 0.0, 1.3),          // open C curl
    ribbon(2.1, 2.1, 0.8, 0.12, 1.0),         // tight clock-spring curl
    ribbon(2.6, 1.3, 1.1, 1.05, 0.9),         // helical spring
  ];
  const chipMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.26, side: THREE.DoubleSide,
    iridescence: 0.15, iridescenceIOR: 1.9, iridescenceThicknessRange: [240, 300],
  });
  const TEMPER = [
    [0xa9acb0, 0.5], [0xd6b26a, 0.16], [0xa8703f, 0.12], [0x6c5490, 0.06], [0x3f62aa, 0.16],
  ];
  const CHIPS_PER = Q ? 46 : 22;
  const chipMeshes = chipGeos.map((geo) => {
    const im = new THREE.InstancedMesh(geo, chipMat, CHIPS_PER);
    im.castShadow = false; im.frustumCulled = false;
    return im;
  });
  const chipSeeds = [];
  {
    const r = rng(20261102);
    const col = new THREE.Color();
    for (let k = 0; k < chipMeshes.length; k++) {
      for (let i = 0; i < CHIPS_PER; i++) {
        let pick = r(), acc = 0, hex = TEMPER[0][0];
        for (const [h, w] of TEMPER) { acc += w; if (pick <= acc) { hex = h; break; } }
        col.setHex(hex).convertSRGBToLinear();
        chipMeshes[k].setColorAt(i, col);
        chipSeeds.push({
          mesh: k, i,
          phase: r(),
          ang: -Math.PI / 2 + (r() - 0.6) * 0.8,   // released where the edge leaves the cut (near side)
          h: 2.5 + r() * 3.5,
          vt: 14 + r() * 34,
          vu: 22 + r() * 40,
          vr: 1 + r() * 7,
          life: 1.4 + r() * 1.8,
          size: 0.5 + r() * 0.55,
          q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28)),
          axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
          spin: 1.5 + r() * 5,
        });
      }
    }
    chipMeshes.forEach((m) => { m.instanceColor.needsUpdate = true; });
  }
  const CYCLE = 4.8;   // every chip slot is reused once per cycle; the loop length for the film

  // ---------- assembly ----------
  const root = new THREE.Group();          // world placement of the tool frame
  const spinner = new THREE.Group();       // everything that turns with the spindle
  root.add(spinner);
  const STICK = 38.0;
  const parts = {
    endmill: buildEndMill(),
    collet: buildCollet(),
    nut: buildNut(),
    holder: buildHolder(),
    stud: buildPullStud(),
  };
  const base = {
    endmill: 0,
    collet: STICK - 0.6,
    nut: STICK,
    holder: STICK,
    stud: STICK + 70 + 68.25,
  };
  const explodeBy = { endmill: -150, collet: -40, nut: -76, holder: 0, stud: 30 };
  for (const k of Object.keys(parts)) { spinner.add(parts[k]); parts[k].position.y = base[k]; }
  scene.add(root);

  const work = buildWorkpiece();
  scene.add(work);
  // chips already lying in the slot and on the top face
  {
    const r = rng(311);
    const n = Q ? 70 : 30;
    const rest = chipGeos.map((g) => new THREE.InstancedMesh(g, chipMat, n));
    const col = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), m4 = new THREE.Matrix4();
    rest.forEach((im, k) => {
      for (let i = 0; i < n; i++) {
        const inSlot = r() < 0.55;
        const x = inSlot ? -8 - r() * 120 : -40 + r() * 70;
        const z = inSlot ? (r() - 0.5) * 9 : (r() < 0.5 ? -1 : 1) * (8 + r() * 26);
        const y = inSlot ? 0.6 : 6.6;
        e.set((r() - 0.5) * 1.2 + Math.PI / 2 * (r() < 0.5 ? 1 : 0), r() * 6.28, (r() - 0.5) * 1.2);
        q.setFromEuler(e);
        const s = 0.5 + r() * 0.5;
        m4.compose(v.set(x, y, z), q, sc.set(s, s, s));
        im.setMatrixAt(i, m4);
        let pick = r(), acc = 0, hex = TEMPER[0][0];
        for (const [h, w] of TEMPER) { acc += w; if (pick <= acc) { hex = h; break; } }
        im.setColorAt(i, col.setHex(hex).convertSRGBToLinear());
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      im.receiveShadow = true;
      work.add(im);
    });
  }
  // studio backdrop: a soft falloff behind the subject so dark metal separates from the void
  const backdrop = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(256, 300, 10, 256, 300, 300);
    grd.addColorStop(0, '#202124'); grd.addColorStop(0.55, '#121214'); grd.addColorStop(1, '#0a0a0b');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1600), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, depthWrite: false }));
    m.position.set(60, 60, -900);
    m.renderOrder = -1;
    return m;
  })();
  scene.add(backdrop);
  const chipRoot = new THREE.Group();
  chipMeshes.forEach((m) => chipRoot.add(m));
  scene.add(chipRoot);

  // ---------- camera ----------
  const camera = new THREE.PerspectiveCamera(20, 16 / 9, 5, 5000);
  const camA = { pos: new THREE.Vector3(-62, 74, 262), look: new THREE.Vector3(6, 16, 0) };
  const camB = { pos: new THREE.Vector3(-60, 200, 700), look: new THREE.Vector3(40, 86, 0) };

  // ---------- state ----------
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion();
  const tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;

  const state = {
    t: 0, spin: 0.55, emit: 1, holdAt: null, lift: 0, explode: 0, turn: 0, cam: 0,
    envYaw: 0, framing: 'wide', parallaxX: 0, parallaxY: 0, shiftX: 0, fov: 20,
  };

  function updateChips() {
    const { t } = state;
    const emitting = state.emit;
    const visibleBefore = state.holdAt == null ? Infinity : state.holdAt;
    const perMesh = new Array(chipMeshes.length).fill(0);
    const fade = 1 - smooth(state.lift * 2.2);
    for (const c of chipSeeds) {
      const m = chipMeshes[c.mesh];
      // most recent birth of this chip slot not after t
      const birth = Math.floor((t - c.phase * CYCLE) / CYCLE) * CYCLE + c.phase * CYCLE;
      const age = t - birth;
      let show = age >= 0 && age < c.life && emitting > 0 && birth <= visibleBefore && fade > 0.001;
      if (show && emitting < 1) show = c.phase < emitting + 0.001;
      if (!show) { tmpM.makeScale(0, 0, 0); m.setMatrixAt(c.i, tmpM); continue; }
      // the cutting side faces +x (feed direction); tangential direction for counter-clockwise spin seen from above
      const a = c.ang;
      const px = R * Math.cos(a), pz = -R * Math.sin(a);
      const tx = Math.sin(a), tz = Math.cos(a);             // tangent for clockwise rotation seen from above
      const rx = Math.cos(a), rz = -Math.sin(a);
      const ax = 0, ay = -58, az = 0;                       // slow-motion gravity
      const x = px + (tx * c.vt + rx * c.vr) * age + 0.5 * ax * age * age;
      const y = c.h + c.vu * age + 0.5 * ay * age * age;
      const z = pz + (tz * c.vt + rz * c.vr) * age + 0.5 * az * age * age;
      tmpQ2.setFromAxisAngle(c.axis, c.spin * age);
      tmpQ.copy(c.q).premultiply(tmpQ2);
      const life01 = age / c.life;
      const s = c.size * (life01 < 0.06 ? life01 / 0.06 : 1) * (life01 > 0.85 ? (1 - life01) / 0.15 : 1) * fade;
      tmpS.set(s, s, s);
      tmpV.set(x, Math.max(y, -60), z);
      tmpM.compose(tmpV, tmpQ, tmpS);
      m.setMatrixAt(c.i, tmpM);
      perMesh[c.mesh]++;
    }
    chipMeshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  }

  function update(next = {}) {
    Object.assign(state, next);
    const { t, explode, turn, lift } = state;
    // spindle: angle is spin * t (rev/s); feed hold keeps the spindle turning
    spinner.rotation.y = -state.spin * t * Math.PI * 2;
    // explode along the tool axis
    const e = smooth(explode);
    for (const k of Object.keys(parts)) parts[k].position.y = base[k] + explodeBy[k] * e;
    // lift out of the cut, then turn to the display pose
    const L = smooth(lift), T = smooth(turn);
    root.position.set(lerp(0, 0, T), lerp(0, 40, L) + lerp(0, 30, T), 0);
    root.rotation.z = lerp(0, state.framing === 'tall' ? -0.62 : -1.24, T);
    root.rotation.x = lerp(0, 0.2, T);
    // the workpiece drops away as the tool lifts
    work.position.y = -140 * smooth((lift - 0.25) / 0.75);
    work.visible = lift < 0.999;
    chipRoot.visible = lift < 0.6;
    // camera
    const c = smooth(state.cam);
    const tall = state.framing === 'tall';
    const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    const pa = state.camAPos ? V(state.camAPos) : tall ? new THREE.Vector3(-30, 40, 300) : camA.pos;
    const la = state.camALook ? V(state.camALook) : tall ? new THREE.Vector3(4, 34, 0) : camA.look;
    let pb, lb;
    if (state.camBPos) { pb = V(state.camBPos); lb = V(state.camBLook || [40, 86, 0]); }
    else if (state.cam > 0 && fitInfo !== undefined) { const f = fitCamB(camera.aspect * (state.fitAspect || 1), state.fitMargin || 1.12); pb = f.pos; lb = f.look; }
    else { pb = camB.pos; lb = camB.look; }
    camera.position.lerpVectors(pa, pb, c);
    camera.position.x += state.parallaxX * lerp(10, 30, c);
    camera.position.y += state.parallaxY * lerp(6, 20, c);
    tmpV.lerpVectors(la, lb, c);
    camera.lookAt(tmpV);
    const fovNow = lerp(state.fov, state.fovB || 20, c);
    if (camera.fov !== fovNow) { camera.fov = fovNow; }
    camera.filmOffset = state.shiftX * camera.getFilmWidth() * 0.5;
    if (state.shiftY && viewW) camera.setViewOffset(viewW, viewH, 0, state.shiftY * viewH, viewW, viewH);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    camera.updateProjectionMatrix();
    scene.environmentRotation.y = state.envYaw;
    updateChips();
  }

  // Fit the exploded assembly into the frame: computed once in the display pose.
  let fitInfo = null;
  const fitCache = {};
  function computeFit() {
    if (fitCache[state.framing]) { fitInfo = fitCache[state.framing]; return; }
    const keep = { ...state };
    update({ lift: 1, turn: 1, explode: 1, cam: 0 });
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const k of Object.keys(parts)) box.expandByObject(parts[k]);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const pts = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z));
    fitInfo = { center: sphere.center.clone(), radius: sphere.radius, pts };
    fitCache[keep.framing] = fitInfo;
    Object.assign(state, keep);
    update();
  }
  // direction from the subject to camera B (elevated 3/4 view)
  const camBDir = new THREE.Vector3(-0.08, 0.28, 1).normalize();
  function fitCamB(aspect, margin = 1.12) {
    if (!fitInfo || fitCache[state.framing] !== fitInfo) computeFit();
    const fovV = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(state.fovB || 20) / 2) * (state.fitHeight || 1));
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
    // project the box corners onto the camera plane to get extents
    const fwd = camBDir.clone().negate();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    let hx = 0, hy = 0;
    for (const p of fitInfo.pts) {
      const d = p.clone().sub(fitInfo.center);
      hx = Math.max(hx, Math.abs(d.dot(right)));
      hy = Math.max(hy, Math.abs(d.dot(up)));
    }
    const dist = Math.max((hx * margin) / Math.tan(fovH / 2), (hy * margin) / Math.tan(fovV / 2)) + fitInfo.radius * 0.35;
    return { pos: fitInfo.center.clone().add(camBDir.clone().multiplyScalar(dist)), look: fitInfo.center.clone() };
  }

  let viewW = 0, viewH = 0;
  function resize(w, h, dpr = 1) {
    viewW = w; viewH = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() { renderer.render(scene, camera); }

  // Screen positions of named points (for plotted callouts in HTML/SVG)
  const anchors = {
    edge: () => new THREE.Vector3(R * 0.9, 9, 0),
    endmill: () => new THREE.Vector3(R, 12, 0),
    shank: () => new THREE.Vector3(R, 52, 0),
    collet: () => new THREE.Vector3(14, 20, 0),
    nut: () => new THREE.Vector3(25, 11, 0),
    holder: () => new THREE.Vector3(23, 36, 0),
    flange: () => new THREE.Vector3(31.75, 62, 0),
    taper: () => new THREE.Vector3(18, 104, 0),
    stud: () => new THREE.Vector3(9.4, 16, 0),
  };
  const anchorPart = { edge: 'endmill', endmill: 'endmill', shank: 'endmill', collet: 'collet', nut: 'nut', holder: 'holder', flange: 'holder', taper: 'holder', stud: 'stud' };
  function project(name, w, h) {
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    const p = parts[anchorPart[name]];
    const v = anchors[name]();
    // anchors are placed on the side facing the camera, not spun with the part
    v.applyMatrix4(new THREE.Matrix4().makeTranslation(0, p.position.y, 0));
    v.applyMatrix4(root.matrixWorld);
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z };
  }

  function compile() {
    if (renderer.compileAsync) return renderer.compileAsync(scene, camera);
    renderer.compile(scene, camera); return Promise.resolve();
  }

  function dispose() {
    renderer.dispose();
    envRT.dispose();
  }

  update();
  return { work, chipRoot, backdrop, key, mat, rng, fitCamB, computeFit, THREE, renderer, scene, camera, update, render, resize, project, compile, dispose, state, CYCLE, parts, root };
}
