// engrave3d.js: Machine 3 engraves MARCEL into a black-oxide steel plate with a 1/4" spot drill.
// The toolpath is real single-stroke lettering (Hershey Simplex), run as G-code: rapid, plunge, feed, retract.
// Units are millimetres. The plate's top face is y = 0, centred on the origin, text reading toward +z.
import { buildToolRig, rng } from './toolrig.js';

export const PLATE = { L: 203.2, W: 63.5, T: 12.7 };    // 8.000 x 2.500 x 0.500 in
const HOLE_X = 91.44;                                   // counterbores at +/- 3.600 in
const DEPTH = 0.635;                                    // .025 in deep: a .050 in wide line with a 90-degree point
const CLEAR = 2.54;                                     // .100 in above the part for rapids

// strokes for a string, from Hershey glyph data { ch: [d, advance] } (glyph units, y up)
export function toolpath(HERSHEY, text, { height = 25.4, tracking = 0.12 } = {}) {
  const strokes = [];
  let adv = 0, minY = 1e9, maxY = -1e9;
  for (const ch of text) {
    const g = HERSHEY[ch];
    if (!g) continue;
    const re = /([ML])\s*([-\d.]+)\s+([-\d.]+)/g;
    let m;
    while ((m = re.exec(g[0]))) {
      const x = +m[2] + adv, y = +m[3];
      if (m[1] === 'M') strokes.push([]);
      strokes[strokes.length - 1].push([x, y]);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    adv += g[1] * (1 + tracking);
  }
  const s = height / (maxY - minY);
  let minX = 1e9, maxX = -1e9;
  for (const st of strokes) for (const p of st) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return strokes.filter((st) => st.length > 1).map((st) => st.map(([x, y]) => [(x - cx) * s, (y - cy) * s]));
}

// the run as timed moves, and the G-code it would be
export function program(strokes, { feedVis = 62, rapidVis = 640, plungeT = 0.1 } = {}) {
  const moves = [];      // { kind, t0, t1, a:[x,y,z], b:[x,y,z], n }
  const blocks = [];
  let t = 0, n = 10, cur = [0, 0, CLEAR + 25];
  const inch = (v) => (v / 25.4).toFixed(4);
  const push = (kind, b, dur, code) => { moves.push({ kind, t0: t, t1: t + dur, a: cur, b, n }); blocks.push({ n, code, t0: t }); t += dur; cur = b; n += 10; };
  blocks.push({ n: 0, code: 'O0042 (MARCEL PLATE, MACHINE 3)', t0: 0 }, { n: 0, code: 'G20 G90 G54 G17', t0: 0 }, { n: 0, code: 'T07 M06 (1/4 90DEG SPOT DRILL)', t0: 0 }, { n: 0, code: 'S12000 M03', t0: 0 }, { n: 0, code: '(DRY, AIR BLAST ON THE CUT)', t0: 0 }, { n: 0, code: 'G43 H07 Z0.1000', t0: 0 });
  for (const st of strokes) {
    const [x0, y0] = st[0];
    const d = Math.hypot(x0 - cur[0], y0 - cur[1]);
    push('rapid', [x0, y0, CLEAR], Math.max(0.1, d / rapidVis), `G00 X${inch(x0)} Y${inch(y0)}`);
    push('plunge', [x0, y0, -DEPTH], plungeT, `G01 Z${inch(-DEPTH)} F10.`);
    for (let i = 1; i < st.length; i++) {
      const [x, y] = st[i];
      const len = Math.hypot(x - cur[0], y - cur[1]);
      push('feed', [x, y, -DEPTH], Math.max(0.02, len / feedVis), `G01 X${inch(x)} Y${inch(y)}${i === 1 ? ' F30.' : ''}`);
    }
    push('retract', [cur[0], cur[1], CLEAR], plungeT * 0.7, `G00 Z${inch(CLEAR)}`);
  }
  push('rapid', [cur[0], cur[1], CLEAR + 25], 0.4, 'G00 Z1.0000');
  blocks.push({ n, code: 'G91 G28 Z0.', t0: t }, { n: n + 10, code: 'G90', t0: t }, { n: n + 20, code: 'M05', t0: t }, { n: n + 30, code: 'M30', t0: t });
  let feedLen = 0, rapidLen = 0;
  for (const m of moves) { const l = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1], m.b[2] - m.a[2]); if (m.kind === 'feed') feedLen += l; else rapidLen += l; }
  // what the same run takes at F30 (12.7 mm/s), F10 plunges and ~250 IPM rapids
  const realT = feedLen / 12.7 + moves.filter((m) => m.kind === 'plunge').length * (DEPTH / 4.23 + 0.4) + rapidLen / 106;
  return { moves, blocks, duration: t, feedLen, speedup: realT / t };
}

export function createEngrave(THREE, addons, { canvas, quality = 'high', HERSHEY }) {
  const { EffectComposer, RenderPass, UnrealBloomPass, BokehPass, ShaderPass, OutputPass, RectAreaLightUniformsLib } = addons;
  const Q = quality === 'high';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !Q, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  if (RectAreaLightUniformsLib) RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060607);

  // reflections: an overhead softbox and two strips, as in a product studio
  {
    const env = new THREE.Scene();
    const panel = (w, h, x, y, z, rx, ry, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m); };
    panel(12, 5, -2, 9, 3, Math.PI / 2, 0, 3.2);
    panel(1.2, 12, -11, 2, -3, 0, Math.PI / 2.3, 2.6);
    panel(1.0, 12, 11, 2, -4, 0, -Math.PI / 2.3, 1.8);
    panel(10, 2.4, 0, 1, 12, 0, 0, 0.45);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.02).texture;
    pmrem.dispose();
  }

  const r = rng(4242);
  const canvasTex = (w, h, draw, srgb = true) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const tex = new THREE.CanvasTexture(c); if (srgb) tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    return { tex, c, g };
  };

  // ---------- machine table, fixture plate ----------
  const tableMat = new THREE.MeshPhysicalMaterial({ color: 0x18191c, metalness: 0.8, roughness: 0.5 });
  const table = new THREE.Group();
  {
    const top = new THREE.Mesh(new THREE.BoxGeometry(1400, 60, 520), tableMat); top.position.set(0, -12.7 - 19 - 30, -40); top.receiveShadow = true; table.add(top);
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.9 });
    for (const z of [-250, -150, 70, 170]) { const s = new THREE.Mesh(new THREE.BoxGeometry(1400, 1, 18), slotMat); s.position.set(0, -12.7 - 19 + 0.3, z); table.add(s); }
  }
  // fixture plate: bead-blasted aluminium with a 1" grid of tapped holes
  const FX = { L: 320, W: 200 };
  const fixtureMat = (() => {
    const { tex } = canvasTex(1280, 800, (g, w, h) => {
      g.fillStyle = '#44484d'; g.fillRect(0, 0, w, h);
      const img = g.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 22; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
      g.putImageData(img, 0, 0);
      const px = w / FX.L;   // 4 px per mm both ways
      for (let x = -127; x <= 127.1; x += 50.8) for (let z = -76.2; z <= 76.3; z += 50.8) {
        const cx = (x + FX.L / 2) * px, cy = (z + FX.W / 2) * px;
        g.fillStyle = '#0a0b0c'; g.beginPath(); g.arc(cx, cy, 4.2 * px, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(200,204,210,0.5)'; g.lineWidth = 0.9 * px; g.beginPath(); g.arc(cx, cy, 5.0 * px, 0, Math.PI * 2); g.stroke();
      }
    });
    return new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: tex, metalness: 0.85, roughness: 0.6 });
  })();
  const fixture = new THREE.Mesh(new THREE.BoxGeometry(FX.L, 19, FX.W), [tableMat, tableMat, fixtureMat, tableMat, tableMat, tableMat]);
  fixture.position.set(0, -12.7 - 9.5, -6); fixture.castShadow = true; fixture.receiveShadow = true;
  scene.add(table, fixture);

  // ---------- the plate ----------
  const plate = new THREE.Group();
  const oxideSide = new THREE.MeshPhysicalMaterial({ color: 0x1c1d21, metalness: 0.85, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  {
    const C = 0.8;   // chamfer
    const sh = new THREE.Shape();
    sh.moveTo(-PLATE.L / 2 + C, -PLATE.W / 2 + C); sh.lineTo(PLATE.L / 2 - C, -PLATE.W / 2 + C); sh.lineTo(PLATE.L / 2 - C, PLATE.W / 2 - C); sh.lineTo(-PLATE.L / 2 + C, PLATE.W / 2 - C); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: PLATE.T - 2 * C, bevelEnabled: true, bevelThickness: C, bevelSize: C, bevelSegments: 1 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, -PLATE.T + C, 0);
    const body = new THREE.Mesh(geo, oxideSide); body.castShadow = true; body.receiveShadow = true;
    plate.add(body);
  }
  // the top face carries the engraving: colour, and a packed map (R height, G roughness, B metalness)
  const TW = Q ? 2304 : 1536, TH = Math.round(TW * (PLATE.W / PLATE.L));
  const PX = TW / PLATE.L;
  const BASE = { color: '#1a1b1f', data: 'rgb(255,118,150)' };
  // the faced top: a 3" face mill leaves overlapping arcs along the plate, under the oxide
  const swirl = (g, x0, y0, x1, y1) => {
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    const R = 38.1 * (TW / PLATE.L), step = 1.6 * (TW / PLATE.L);
    for (let cx = -R; cx < TW + R; cx += step) {
      g.strokeStyle = `rgba(255,255,255,${0.018 + r() * 0.022})`; g.lineWidth = 0.6 + r() * 0.9;
      g.beginPath(); g.arc(cx, TH / 2 + (r() - 0.5) * 2, R, -0.95, 0.95); g.stroke();
    }
    g.restore();
  };
  const colorT = canvasTex(TW, TH, (g, w, h) => {
    g.fillStyle = BASE.color; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 6; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 1.2; }
    g.putImageData(img, 0, 0);
    swirl(g, 0, 0, w, h);
  });
  const dataT = canvasTex(TW, TH, (g, w, h) => { g.fillStyle = BASE.data; g.fillRect(0, 0, w, h); }, false);
  const topMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: colorT.tex, bumpMap: dataT.tex, bumpScale: 3.2, roughnessMap: dataT.tex, metalnessMap: dataT.tex, metalness: 1, roughness: 1, clearcoat: 0.18, clearcoatRoughness: 0.55 });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(PLATE.L - 1.6, PLATE.W - 1.6), topMat);
  top.rotation.x = -Math.PI / 2; top.position.y = 0.02; top.receiveShadow = true;
  // the texture covers the full top including the chamfer band, so scale UVs to the face
  colorT.tex.repeat.set((PLATE.L - 1.6) / PLATE.L, (PLATE.W - 1.6) / PLATE.W); colorT.tex.offset.set(0.8 / PLATE.L, 0.8 / PLATE.W);
  dataT.tex.repeat.copy(colorT.tex.repeat); dataT.tex.offset.copy(colorT.tex.offset);
  plate.add(top);
  // two counterbored 1/4-20 socket head cap screws hold it down
  {
    const shcs = new THREE.MeshPhysicalMaterial({ color: 0x24262a, metalness: 0.9, roughness: 0.32 });
    const hexMat = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.8 });
    for (const x of [-HOLE_X, HOLE_X]) {
      const cx = (x + PLATE.L / 2) * PX, cy = (PLATE.W / 2) * PX;
      for (const [g, col] of [[colorT.g, '#050506'], [dataT.g, 'rgb(40,200,60)']]) { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, 5.6 * PX, 0, Math.PI * 2); g.fill(); }
      colorT.g.strokeStyle = 'rgba(205,208,212,0.85)'; colorT.g.lineWidth = 0.7 * PX; colorT.g.beginPath(); colorT.g.arc(cx, cy, 6.0 * PX, 0, Math.PI * 2); colorT.g.stroke();
      const head = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 4.75, 0.6, 48), shcs); head.position.set(x, 0.06, 0); head.receiveShadow = true; plate.add(head);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.22, 8, 48), new THREE.MeshPhysicalMaterial({ color: 0x8a8d92, metalness: 1, roughness: 0.3 })); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.36, 0); plate.add(rim);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.2, 6), hexMat); sock.position.set(x, 0.38, 0); plate.add(sock);
    }
  }
  scene.add(plate);

  // ---------- the tool: T07, a 1/4" spot drill in an ER32 collet, CAT40 ----------
  const rig = buildToolRig(THREE, { quality, chips: false, work: false, cutter: 'spot', toolNo: 'T07' });
  rig.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(rig.root);
  // a dark spindle nose above the holder
  {
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(66, 70, 160, 96), new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, metalness: 0.6, roughness: 0.48 }));
    nose.position.y = rig.STICK + 70 + 80 + 2; rig.root.add(nose);
    const face = new THREE.Mesh(new THREE.RingGeometry(36, 66, 96), new THREE.MeshPhysicalMaterial({ color: 0x9a9da2, metalness: 1, roughness: 0.3, side: THREE.DoubleSide }));
    face.rotation.x = Math.PI / 2; face.position.y = rig.STICK + 70 + 2.1; rig.root.add(face);
  }

  // ---------- chips: tiny curls, heat-tinted, that fly, bounce and stay ----------
  const chipGeo = (() => {
    const pos = [], idx = [], NU = 18, turns = 1.3;
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, a = u * Math.PI * 2 * turns, rad = 0.55 - 0.25 * u;
      pos.push(rad * Math.cos(a), u * 0.25 - 0.12, rad * Math.sin(a), rad * Math.cos(a), u * 0.25 + 0.12, rad * Math.sin(a));
    }
    for (let i = 0; i < NU; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  const chipMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.5, envMapIntensity: 0.6, side: THREE.DoubleSide, iridescence: 0.15, iridescenceIOR: 1.9, iridescenceThicknessRange: [240, 320] });
  const NCH = Q ? 520 : 260;
  const chips = new THREE.InstancedMesh(chipGeo, chipMat, NCH); chips.frustumCulled = false; chips.castShadow = true;
  const TEMPER = [[0x9fa2a6, 0.74], [0xdcb76c, 0.11], [0xb07440, 0.07], [0x7a5698, 0.03], [0x3f66b4, 0.05]];
  const col = new THREE.Color();
  const cs = [];
  for (let i = 0; i < NCH; i++) {
    let p = r(), acc = 0, hex = TEMPER[0][0]; for (const [h, w] of TEMPER) { acc += w; if (p <= acc) { hex = h; break; } }
    chips.setColorAt(i, col.setHex(hex).convertSRGBToLinear());
    cs.push({ alive: false, rest: false, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), s: 0.5 + r() * 0.8 });
  }
  scene.add(chips);
  let chipNext = 0, chipAcc = 0;
  const m4 = new THREE.Matrix4(), qd = new THREE.Quaternion(), sv = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < NCH; i++) chips.setMatrixAt(i, zero);
  function emit(x, z, dir) {
    const c = cs[chipNext]; chipNext = (chipNext + 1) % NCH;
    const side = r() < 0.5 ? -1 : 1, sp = 14 + r() * 46;
    c.alive = true; c.rest = false;
    c.p.set(x + (r() - 0.5) * 1.5, 0.6, z + (r() - 0.5) * 1.5);
    // flung off the cutting edge: sideways to the feed, and up
    c.v.set(-dir[1] * side * sp + dir[0] * sp * 0.25 * (r() - 0.3), 30 + r() * 95, dir[0] * side * sp + dir[1] * sp * 0.25 * (r() - 0.3));
    c.q.setFromEuler(new THREE.Euler(r() * 6.3, r() * 6.3, r() * 6.3));
    c.w.set(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(40);
  }
  function stepChips(dt) {
    for (let i = 0; i < NCH; i++) {
      const c = cs[i];
      if (!c.alive) continue;
      if (!c.rest) {
        c.v.y -= 9810 * dt * 0.55;
        c.p.addScaledVector(c.v, dt);
        const onPlate = Math.abs(c.p.x) < PLATE.L / 2 && Math.abs(c.p.z) < PLATE.W / 2;
        const onFix = Math.abs(c.p.x) < FX.L / 2 && Math.abs(c.p.z + 6) < FX.W / 2;
        const floor = onPlate ? 0.25 : onFix ? -12.7 + 0.25 : -12.7 - 19 + 0.25;
        if (c.p.y < floor) {
          c.p.y = floor;
          if (Math.abs(c.v.y) < 60) { c.rest = true; c.v.set(0, 0, 0); }
          else { c.v.y *= -0.28; c.v.x *= 0.45; c.v.z *= 0.45; c.w.multiplyScalar(0.5); }
        }
        const a = c.w.length();
        if (a > 0) { qd.setFromAxisAngle(sv.copy(c.w).multiplyScalar(1 / a), a * dt); c.q.premultiply(qd); }
      }
      m4.compose(c.p, c.q, sv.setScalar(c.s)); chips.setMatrixAt(i, m4);
    }
    chips.instanceMatrix.needsUpdate = true;
  }
  function clearChips() { for (let i = 0; i < NCH; i++) { cs[i].alive = false; chips.setMatrixAt(i, zero); } chips.instanceMatrix.needsUpdate = true; }

  // ---------- lights ----------
  if (RectAreaLightUniformsLib) {
    const key = new THREE.RectAreaLight(0xffffff, 4.2, 380, 180); key.position.set(-160, 300, 190); key.lookAt(0, 0, 0); scene.add(key);
    const rim = new THREE.RectAreaLight(0xdfe8ff, 9, 60, 360); rim.position.set(260, 140, -260); rim.lookAt(0, 40, 0); scene.add(rim);
    const kick = new THREE.RectAreaLight(0xffe7cc, 3, 300, 40); kick.position.set(80, 40, 320); kick.lookAt(0, 0, 0); scene.add(kick);
  }
  const spot = new THREE.SpotLight(0xffffff, 1.5e5, 0, 0.4, 0.7, 1.6);
  spot.position.set(-220, 520, 260); spot.target.position.set(0, 0, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(Q ? 2048 : 1024, Q ? 2048 : 1024); spot.shadow.bias = -0.00025; spot.shadow.radius = 3;
  scene.add(spot, spot.target);
  scene.add(new THREE.HemisphereLight(0x9aa4b4, 0x0a0a0b, 0.08));

  // ---------- camera and post ----------
  const camera = new THREE.PerspectiveCamera(26, 16 / 9, 5, 8000);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let bokeh = null;
  if (Q && BokehPass) { bokeh = new BokehPass(scene, camera, { focus: 420, aperture: 0.0000036, maxblur: 0.006 }); composer.addPass(bokeh); }
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.08, 0.4, 0.96); composer.addPass(bloom);
  const grain = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.012 }, uVig: { value: 0.42 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec2 c = vUv - 0.5; vec3 col = texture2D(tDiffuse, vUv).rgb;
        col *= 1.0 - uVig * smoothstep(0.06, 0.6, dot(c, c));
        col += (h(vUv * vec2(1931.0, 1171.0) + fract(uTime * 7.13)) - 0.5) * uGrain * (0.35 + 0.65 * (1.0 - col));
        gl_FragColor = vec4(col, 1.0); }`,
  });
  composer.addPass(grain);
  composer.addPass(new OutputPass());

  // ---------- the run ----------
  const strokes = toolpath(HERSHEY, 'MARCEL', { height: 25.4, tracking: 0.16 });
  const prog = program(strokes);
  const state = { t: 0, done: false, block: 0, kind: 'rapid', load: 0 };
  const toCanvas = (x, y) => [(x + PLATE.L / 2) * PX, (PLATE.W / 2 - y) * PX];   // toolpath y points away from the viewer
  const GW = DEPTH * 2 * PX;   // groove width at the surface, in texels
  function cutSegment(x0, y0, x1, y1) {
    const [a, b] = toCanvas(x0, y0), [c, d] = toCanvas(x1, y1);
    const g = colorT.g, h = dataT.g;
    g.lineCap = h.lineCap = 'round'; g.lineJoin = h.lineJoin = 'round';
    // fresh steel in the groove, with darker walls
    g.strokeStyle = '#7d8086'; g.lineWidth = GW * 1.45; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
    g.strokeStyle = '#e3e6e9'; g.lineWidth = GW * 1.0; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
    // a V: each narrower pass is deeper (R), polished (G low), bare metal (B high)
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const k = i / steps;
      h.strokeStyle = `rgb(${Math.round(255 * (1 - (k + 0.2) * 0.85))},${Math.round(70 - k * 20)},255)`;
      h.lineWidth = GW * (1.1 - k * 0.95); h.beginPath(); h.moveTo(a, b); h.lineTo(c, d); h.stroke();
    }
    colorT.tex.needsUpdate = true; dataT.tex.needsUpdate = true;
  }
  let lastCut = null;
  function toolAt(t) {
    // position and move for time t
    const ms = prog.moves;
    let lo = 0, hi = ms.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ms[mid].t1 < t) lo = mid + 1; else hi = mid; }
    const m = ms[Math.min(lo, ms.length - 1)];
    const k = Math.max(0, Math.min(1, (t - m.t0) / (m.t1 - m.t0)));
    return { m, x: m.a[0] + (m.b[0] - m.a[0]) * k, y: m.a[1] + (m.b[1] - m.a[1]) * k, z: m.a[2] + (m.b[2] - m.a[2]) * k };
  }
  function resetPlate() {
    const fresh = (T, base) => { T.g.globalCompositeOperation = 'source-over'; };
    fresh(colorT); fresh(dataT);
    // redraw only the engraved band: clear it with the base finish
    const [x0, y0] = toCanvas(-84, PLATE.W / 2 - 6), [x1, y1] = toCanvas(84, -PLATE.W / 2 + 6);
    colorT.g.save(); colorT.g.beginPath(); colorT.g.rect(x0, y0, x1 - x0, y1 - y0); colorT.g.clip();
    colorT.g.fillStyle = BASE.color; colorT.g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const img = colorT.g.getImageData(Math.floor(x0), Math.floor(y0), Math.ceil(x1 - x0), Math.ceil(y1 - y0));
    for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 7; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 1.2; }
    colorT.g.putImageData(img, Math.floor(x0), Math.floor(y0));
    colorT.g.restore();
    swirl(colorT.g, x0, y0, x1, y1);
    dataT.g.fillStyle = BASE.data; dataT.g.fillRect(x0, y0, x1 - x0, y1 - y0);
    colorT.tex.needsUpdate = true; dataT.tex.needsUpdate = true;
    clearChips();
    lastCut = null;
  }
  // move the run to time t (forward only, cutting what the tool passed through)
  let spinT = 0;
  function update(t, dt) {
    t = Math.max(0, Math.min(prog.duration, t));
    spinT += dt;
    if (t < state.t - 1e-6) { resetPlate(); state.t = 0; }
    // sample the path finely between the last time and now so fast frames still cut clean lines
    const steps = Math.max(1, Math.ceil((t - state.t) / 0.004));
    let tp = null;
    for (let i = 1; i <= steps; i++) {
      const ti = state.t + ((t - state.t) * i) / steps;
      tp = toolAt(ti);
      const cutting = tp.z < 0;
      if (cutting) {
        if (lastCut) cutSegment(lastCut[0], lastCut[1], tp.x, tp.y);
        lastCut = [tp.x, tp.y];
      } else lastCut = null;
      if (tp.m.kind === 'feed') {
        chipAcc += (Q ? 48 : 30) * ((t - state.t) / steps);
        const dx = tp.m.b[0] - tp.m.a[0], dy = tp.m.b[1] - tp.m.a[1], L = Math.hypot(dx, dy) || 1;
        while (chipAcc >= 1) { chipAcc -= 1; emit(tp.x, -tp.y, [dx / L, -dy / L]); }
      }
    }
    if (!tp) tp = toolAt(t);
    state.t = t;
    state.done = t >= prog.duration - 1e-6;
    state.kind = tp.m.kind;
    state.block = tp.m.n;
    state.x = tp.x; state.y = tp.y; state.z = tp.z;
    state.load = tp.m.kind === 'feed' ? 9 + Math.sin(spinT * 9) * 1.5 + Math.sin(spinT * 23) : tp.m.kind === 'plunge' ? 6 : 2;
    rig.root.position.set(tp.x, tp.z, -tp.y);
    rig.update({ t: spinT, spin: state.done ? 0 : 3.2 });
    stepChips(Math.min(dt, 0.05));
  }

  let W = 1, H = 1;
  function resize(w, h, dpr = 1) {
    W = w; H = h;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function setCamera({ pos, look, fov = 26, viewX = 0, viewY = 0, focus = null }) {
    camera.position.set(...pos); camera.lookAt(...look); camera.fov = fov;
    if (viewX || viewY) camera.setViewOffset(W, H, viewX * W, viewY * H, W, H); else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    if (bokeh) bokeh.uniforms.focus.value = focus != null ? focus : camera.position.distanceTo(new THREE.Vector3(...look));
  }
  let frameNo = 0;
  function render() { frameNo++; grain.uniforms.uTime.value = frameNo * 0.016; composer.render(); }
  function compile() { return renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera)); }
  update(0, 0);
  return { renderer, scene, camera, prog, state, update, resize, setCamera, render, compile, reset: () => { resetPlate(); state.t = 0; update(0, 0); } };
}
