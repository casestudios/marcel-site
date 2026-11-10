// pendant.js: a CNC operator pendant (generic, unbranded) with a 19" 4:3 screen that runs a live
// control UI drawn to a canvas. Units are millimetres; the pendant face is the z=0 plane, facing +z.
// No clocks: the screen is a function of the state passed to update().

export const SCREEN = { w: 386, h: 290, cx: 0, cy: 182, z: -13.5, px: 2048, py: 1536 };

const PROGRAM = [
  'O1001 (BRACKET OP1)', 'N10 G20 G17 G40 G49 G80 G90', 'N20 T02 M06 (1/2 3FL ROUGH)', 'N30 S9000 M03', 'N40 G54 G00 X4.2 Y0.25', 'N50 G43 H02 Z1.0 M08', 'N60 G01 Z-0.125 F20.', 'N70 X0.6 F40.', 'N80 Y0.55', 'N90 X3.9', 'N100 Y0.85', 'N110 X0.6', 'N120 Y1.15', 'N130 X3.9', 'N140 Y1.45', 'N150 X0.6', 'N160 Y1.75', 'N170 X3.9', 'N180 Y2.05', 'N190 X0.6', 'N200 Y2.35', 'N210 X3.9', 'N220 Y2.65', 'N230 X0.6', 'N240 Y2.95', 'N250 X3.9', 'N260 Y3.25', 'N270 X0.6', 'N280 Y3.55', 'N290 X3.9', 'N300 Y3.85', 'N310 X0.6', 'N320 Y4.15', 'N330 X3.9', 'N340 Y4.45', 'N350 X0.6', 'N360 Y4.75', 'N370 X3.9', 'N380 Y5.05', 'N390 X0.6', 'N400 Y5.35', 'N410 X3.9', 'N420 Y5.65', 'N430 X0.6',
];
const ALARMS = [
  ['2026/10/29 14:12:51', 'SP9029', 'SSPA:29 OVERLOAD'], ['2026/10/27 09:03:17', 'SV0401', 'V READY OFF'],
  ['2026/10/27 09:02:58', 'SV0401', 'V READY OFF'], ['2026/10/22 16:40:05', 'OT0501', '- OVERTRAVEL ( SOFT 1 )'],
  ['2026/10/18 11:27:44', 'PS0011', 'FEED ZERO (COMMAND)'], ['2026/10/14 07:55:12', 'OH0701', 'FAN MOTOR STOP'],
  ['2026/10/09 13:18:36', 'SV0436', 'SOFTTHERMAL(OVC)'], ['2026/10/02 10:44:09', 'SP9001', 'SSPA:01 MOTOR OVERHEAT'],
];
const TOOLS = [
  ['T01', '3.0 FACE MILL', 400, 212], ['T02', '0.5 3FL ROUGH EM', 300, 263], ['T03', '0.375 FINISH EM', 300, 141],
  ['T04', 'NO.3 CENTER DRILL', 800, 390], ['T05', 'NO.7 DRILL 0.201', 250, 244], ['T06', '1/4-20 TAP', 200, 88],
];

export function buildPendant(THREE, { RoundedBoxGeometry, quality = 'high' } = {}) {
  const Q = quality === 'high';
  const group = new THREE.Group();
  const canvasTex = (w, h, draw, srgb = true) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  };
  // powder-coat orange peel as a normal map
  const peel = canvasTex(512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    let s = 1234567;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const hgt = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) hgt[i] = rnd();
    for (let pass = 0; pass < 3; pass++) {           // blur into soft bumps
      const nh = new Float32Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) acc += hgt[((y + dy + h) % h) * w + ((x + dx + w) % w)];
        nh[y * w + x] = acc / 25;
      }
      hgt.set(nh);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (hgt[y * w + ((x + 1) % w)] - hgt[y * w + ((x - 1 + w) % w)]) * 6;
      const dy = (hgt[((y + 1) % h) * w + x] - hgt[((y - 1 + h) % h) * w + x]) * 6;
      const o = (y * w + x) * 4;
      img.data[o] = 128 + dx * 127; img.data[o + 1] = 128 + dy * 127; img.data[o + 2] = 255; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
  peel.wrapS = peel.wrapT = THREE.RepeatWrapping; peel.repeat.set(6, 8);

  const mat = {
    shell: new THREE.MeshPhysicalMaterial({ color: 0x24262a, metalness: 0.25, roughness: 0.58, normalMap: peel, normalScale: new THREE.Vector2(0.22, 0.22), clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    bezel: new THREE.MeshPhysicalMaterial({ color: 0x0b0c0d, metalness: 0.0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    plate: new THREE.MeshPhysicalMaterial({ color: 0x5d6166, metalness: 0.85, roughness: 0.36, anisotropy: 0.6 }),
    key: new THREE.MeshPhysicalMaterial({ color: 0x17181b, metalness: 0.05, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.35 }),
    keyLight: new THREE.MeshPhysicalMaterial({ color: 0x8e939a, metalness: 0.1, roughness: 0.4 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xd8dbde, metalness: 1, roughness: 0.12 }),
    knob: new THREE.MeshPhysicalMaterial({ color: 0x111214, metalness: 0.1, roughness: 0.5 }),
    yellow: new THREE.MeshPhysicalMaterial({ color: 0xe8b820, metalness: 0.0, roughness: 0.45, clearcoat: 0.4 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xc8231a, metalness: 0.0, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.15 }),
    arm: new THREE.MeshPhysicalMaterial({ color: 0x2b2e33, metalness: 0.6, roughness: 0.45 }),
    rubber: new THREE.MeshPhysicalMaterial({ color: 0x0e0f10, metalness: 0, roughness: 0.8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.18, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false }),
  };

  // ---------------- housing: rounded slab with a tunnel for the screen ----------------
  const W = 560, H = 790, DEPTH = 118, CR = 26;
  const rr = (shape, x, y, w, h, r) => {
    shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r); shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  };
  const outline = new THREE.Shape(); rr(outline, -W / 2, -H / 2 - 10, W, H, CR);
  const hole = new THREE.Path();
  const SW = SCREEN.w + 34, SH = SCREEN.h + 34;
  hole.moveTo(-SW / 2 + 6, SCREEN.cy - SH / 2); hole.lineTo(SW / 2 - 6, SCREEN.cy - SH / 2); hole.quadraticCurveTo(SW / 2, SCREEN.cy - SH / 2, SW / 2, SCREEN.cy - SH / 2 + 6);
  hole.lineTo(SW / 2, SCREEN.cy + SH / 2 - 6); hole.quadraticCurveTo(SW / 2, SCREEN.cy + SH / 2, SW / 2 - 6, SCREEN.cy + SH / 2);
  hole.lineTo(-SW / 2 + 6, SCREEN.cy + SH / 2); hole.quadraticCurveTo(-SW / 2, SCREEN.cy + SH / 2, -SW / 2, SCREEN.cy + SH / 2 - 6);
  hole.lineTo(-SW / 2, SCREEN.cy - SH / 2 + 6); hole.quadraticCurveTo(-SW / 2, SCREEN.cy - SH / 2, -SW / 2 + 6, SCREEN.cy - SH / 2);
  outline.holes.push(hole);
  const shellGeo = new THREE.ExtrudeGeometry(outline, { depth: DEPTH - 10, bevelEnabled: true, bevelThickness: 5, bevelSize: 5, bevelOffset: -5, bevelSegments: Q ? 4 : 2, curveSegments: Q ? 16 : 8 });
  shellGeo.translate(0, 0, -(DEPTH - 10) - 5);
  // planar UVs for the peel normal map on the front face
  { const p = shellGeo.attributes.position, uv = shellGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + W / 2) / W, (p.getY(i) + H / 2) / H); }
  const shell = new THREE.Mesh(shellGeo, mat.shell); shell.castShadow = true; shell.receiveShadow = true;
  group.add(shell);

  // screen: black bezel frame, the LCD, and a glass cover in the tunnel
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), mat.bezel); bezel.position.set(0, SCREEN.cy, SCREEN.z - 0.6); group.add(bezel);
  const screenCanvas = document.createElement('canvas'); screenCanvas.width = SCREEN.px; screenCanvas.height = SCREEN.py;
  const screenCtx = screenCanvas.getContext('2d');
  const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = 16;
  screenTex.minFilter = THREE.LinearMipmapLinearFilter; screenTex.generateMipmaps = true;
  const lcdMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1.25, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), lcdMat); lcd.position.set(SCREEN.cx, SCREEN.cy, SCREEN.z); group.add(lcd);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(SW - 4, SH - 4), mat.glass); glass.position.set(0, SCREEN.cy, -5); glass.renderOrder = 3; group.add(glass);

  // ---------------- control plate with keys ----------------
  const PLATE = { x: 0, y: -168, w: 504, h: 336 };
  const plate = new THREE.Mesh(RoundedBoxGeometry ? new RoundedBoxGeometry(PLATE.w, PLATE.h, 4, 3, 2) : new THREE.BoxGeometry(PLATE.w, PLATE.h, 4), mat.plate);
  plate.position.set(PLATE.x, PLATE.y, 2); plate.receiveShadow = true; group.add(plate);
  const keyGeo = RoundedBoxGeometry ? new RoundedBoxGeometry(21, 16, 7, 3, 2.4) : new THREE.BoxGeometry(21, 16, 7);
  const keys = [];
  const addGrid = (labels, cols, x0, y0, dx, dy, light = false) => labels.forEach((l, i) => keys.push({ l, x: x0 + (i % cols) * dx, y: y0 - Math.floor(i / cols) * dy, light }));
  // soft keys under the screen
  addGrid(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'], 8, -175, -30, 50, 0, true);
  addGrid(['POS', 'PROG', 'OFFSET', 'SYSTEM', 'MESSAGE', 'GRAPH', 'CUSTOM', 'HELP', 'RESET', 'ALTER', 'INSERT', 'DELETE', 'EOB', 'CAN', 'INPUT', 'SHIFT', 'PAGE UP', 'PAGE DN', 'CURSOR', 'HOME'], 4, -222, -68, 27, 24);
  addGrid(['O', 'N', 'G', '7', '8', '9', 'X', 'Y', 'Z', '4', '5', '6', 'M', 'S', 'T', '1', '2', '3', 'F', 'H', 'D', '-', '0', '.', 'I', 'J', 'K', 'R', 'P', 'Q'], 6, -88, -68, 27, 24);
  addGrid(['+X', '+Y', '+Z', '-X', '-Y', '-Z', 'RAPID', 'JOG', 'HANDLE', 'ZERO', 'SBK', 'DRY'], 3, 140, -68, 36, 24, true);
  const keyMesh = new THREE.InstancedMesh(keyGeo, mat.key, keys.length);
  const keyLightMesh = new THREE.InstancedMesh(keyGeo, mat.keyLight, keys.length);
  { const m4 = new THREE.Matrix4(); let a = 0, b = 0;
    keys.forEach((k) => { m4.makeTranslation(k.x, k.y, 4 + 3.5); if (k.light) keyLightMesh.setMatrixAt(b++, m4); else keyMesh.setMatrixAt(a++, m4); });
    keyMesh.count = a; keyLightMesh.count = b; }
  keyMesh.castShadow = true; keyLightMesh.castShadow = true;
  group.add(keyMesh, keyLightMesh);
  // key legends, at key-top height
  const LEG_PX = 4;   // px per mm
  const legendTex = canvasTex(PLATE.w * LEG_PX, PLATE.h * LEG_PX, (g) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const k of keys) {
      const cx = (k.x - (PLATE.x - PLATE.w / 2)) * LEG_PX, cy = ((PLATE.y + PLATE.h / 2) - k.y) * LEG_PX;
      const n = k.l.length;
      g.font = `600 ${n <= 2 ? 34 : n <= 4 ? 21 : 15}px "Hubot Sans", "Mona Sans", Arial, sans-serif`;
      g.fillStyle = k.light ? '#16171a' : '#e9e7e1';
      g.fillText(k.l, cx, cy + 1);
    }
  });
  const legend = new THREE.Mesh(new THREE.PlaneGeometry(PLATE.w, PLATE.h), new THREE.MeshBasicMaterial({ map: legendTex, transparent: true, depthWrite: false, toneMapped: true }));
  legend.position.set(PLATE.x, PLATE.y, 4 + 7.05); legend.renderOrder = 2; group.add(legend);

  // ---------------- buttons, knobs, E-stop ----------------
  const lathe = (pts, material, segs = Q ? 64 : 32) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs), material);
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  const faceUp = (obj) => { obj.rotation.x = Math.PI / 2; return obj; };   // lathe axis +y -> +z
  const lampMat = (hex) => new THREE.MeshPhysicalMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.05, roughness: 0.25, transmission: 0.0, clearcoat: 1, clearcoatRoughness: 0.1 });
  const startMat = lampMat(0x3fbf62), holdMat = lampMat(0xf0a830);
  function pushButton(x, y, lens) {
    const g = new THREE.Group();
    g.add(faceUp(lathe([[0.01, 0], [24, 0], [24, 4], [22.5, 6.5], [19, 6.5]], mat.chrome)));
    g.add(faceUp(lathe([[18.5, 2], [18.5, 5.5], [16.5, 8.2], [12, 9.4], [0.01, 9.5]], lens)));   // bottom-up, so the lens faces out
    g.position.set(x, y, 4); group.add(g);
    return g;
  }
  pushButton(-170, -292, startMat);
  pushButton(-110, -292, holdMat);
  // E-stop: yellow collar and a red mushroom
  const estop = new THREE.Group();
  estop.add(faceUp(lathe([[0.01, 0], [44, 0], [44, 3], [42, 4.5], [0.01, 4.5]], mat.yellow)));
  estop.add(faceUp(lathe([[0.01, 4.5], [13, 4.5], [13, 16], [30, 18], [33, 22], [32, 28], [26, 32], [0.01, 33]], mat.red)));
  estop.position.set(196, -286, 4); group.add(estop);
  // override knobs with knurled skirts
  const knurl = canvasTex(1024, 64, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 96; i++) { g.fillStyle = i % 2 ? '#d0d0d0' : '#404040'; g.fillRect((i / 96) * w, 0, w / 192, h); } }, false);
  function knob(x, y) {
    const g = new THREE.Group();
    const skirt = lathe([[0.01, 0], [21, 0], [21, 14], [19, 17], [0.01, 17.5]], new THREE.MeshPhysicalMaterial({ color: 0x141518, metalness: 0.1, roughness: 0.48, bumpMap: knurl, bumpScale: 1.2 }));
    g.add(faceUp(skirt));
    const pointer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 14, 0.6), new THREE.MeshBasicMaterial({ color: 0xe9e7e1 }));
    pointer.position.set(0, 9, 17.8); g.add(pointer);
    g.position.set(x, y, 4); group.add(g);
    return g;
  }
  const knobFeed = knob(-10, -286), knobSpindle = knob(78, -286);
  // memory key switch and USB port
  const keySw = new THREE.Group();
  keySw.add(faceUp(lathe([[0.01, 0], [11, 0], [11, 5], [9.5, 6.5], [0.01, 6.5]], mat.chrome)));
  const slot = new THREE.Mesh(new THREE.BoxGeometry(2, 9, 1), mat.rubber); slot.position.z = 6.6; keySw.add(slot);
  keySw.position.set(-226, -282, 4); group.add(keySw);
  const usb = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 2), mat.rubber); usb.position.set(-226, -312, 4.6); group.add(usb);

  // printed panel graphics: group labels, knob scales, E-stop ring text
  const printTex = canvasTex(PLATE.w * LEG_PX, PLATE.h * LEG_PX, (g, w, h) => {
    const X = (mm) => (mm - (PLATE.x - PLATE.w / 2)) * LEG_PX, Y = (mm) => ((PLATE.y + PLATE.h / 2) - mm) * LEG_PX;
    g.fillStyle = 'rgba(233,231,225,0.82)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 17px "Hubot Sans", Arial, sans-serif';
    g.fillText('CYCLE START', X(-170), Y(-260)); g.fillText('FEED HOLD', X(-110), Y(-260));
    g.fillText('FEED %', X(-10), Y(-258)); g.fillText('SPINDLE %', X(78), Y(-258));
    g.fillText('EMERGENCY STOP', X(196), Y(-236));
    g.fillText('MEM PROTECT', X(-226), Y(-262));
    // knob scales
    for (const [cx, labels] of [[-10, ['0', '50', '100', '150', '200']], [78, ['50', '75', '100', '125', '150']]]) {
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI * (1.25 - (1.5 * i) / 20);
        const r0 = 25 * LEG_PX, r1 = (i % 5 ? 27.5 : 29.5) * LEG_PX;
        g.strokeStyle = 'rgba(233,231,225,0.7)'; g.lineWidth = i % 5 ? 1.5 : 2.5;
        g.beginPath(); g.moveTo(X(cx) + r0 * Math.cos(a), Y(-286) - r0 * Math.sin(a)); g.lineTo(X(cx) + r1 * Math.cos(a), Y(-286) - r1 * Math.sin(a)); g.stroke();
        if (i % 5 === 0) { g.font = '600 13px "Hubot Sans", Arial, sans-serif'; const rr2 = 34 * LEG_PX; g.fillText(labels[i / 5], X(cx) + rr2 * Math.cos(a), Y(-286) - rr2 * Math.sin(a)); }
      }
    }
    // thin rules between key groups
    g.strokeStyle = 'rgba(233,231,225,0.18)'; g.lineWidth = 2;
    for (const xm of [-104, 120]) { g.beginPath(); g.moveTo(X(xm), Y(-56)); g.lineTo(X(xm), Y(-200)); g.stroke(); }
    g.beginPath(); g.moveTo(X(-240), Y(-232)); g.lineTo(X(240), Y(-232)); g.stroke();
  });
  const print = new THREE.Mesh(new THREE.PlaneGeometry(PLATE.w, PLATE.h), new THREE.MeshBasicMaterial({ map: printTex, transparent: true, depthWrite: false }));
  print.position.set(PLATE.x, PLATE.y, 4.06); print.renderOrder = 1; group.add(print);
  // name plate on the top bezel
  const nameTex = canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#9da2a8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1c1f'; g.font = '700 54px "Hubot Sans", Arial, sans-serif'; g.textBaseline = 'middle';
    g.fillText('MACHINE 3', 36, h / 2 + 2);
    g.font = '500 30px "Martian Mono", monospace'; g.textAlign = 'right'; g.fillText('VMC  40-TAPER  12,000 RPM', w - 36, h / 2 + 2);
  });
  const name = new THREE.Mesh(new THREE.PlaneGeometry(200, 25), new THREE.MeshPhysicalMaterial({ map: nameTex, metalness: 0.8, roughness: 0.35 }));
  name.position.set(-128, H / 2 - 10 - 22, 0.6); group.add(name);
  void name;

  // ---------------- swing arm and the handwheel pendant ----------------
  const arm = new THREE.Group();
  // the pendant hangs from a boom: a pivot housing on top and a post rising out of frame
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(40, 46, 70, 40), mat.arm); pivot.position.set(140, H / 2 - 10 + 35, -60); arm.add(pivot);
  const post = new THREE.Mesh(new THREE.BoxGeometry(80, 1400, 80), mat.arm); post.position.set(140, H / 2 - 10 + 70 + 700, -60); arm.add(post);
  arm.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  group.add(arm);
  // MPG handwheel hanging on a hook at the right side
  const mpg = new THREE.Group();
  const mpgBody = new THREE.Mesh(RoundedBoxGeometry ? new RoundedBoxGeometry(76, 190, 48, 4, 10) : new THREE.BoxGeometry(76, 190, 48), mat.shell);
  mpg.add(mpgBody);
  const dialTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1a1b1e'; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
    g.strokeStyle = '#e9e7e1'; g.fillStyle = '#e9e7e1'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 100; i++) { const a = (i / 100) * Math.PI * 2; const r1 = 240, r0 = i % 10 ? 222 : 206; g.lineWidth = i % 10 ? 2 : 4; g.beginPath(); g.moveTo(256 + r0 * Math.sin(a), 256 - r0 * Math.cos(a)); g.lineTo(256 + r1 * Math.sin(a), 256 - r1 * Math.cos(a)); g.stroke(); if (i % 10 === 0) { g.font = '600 30px "Hubot Sans", Arial'; g.fillText(String(i), 256 + 180 * Math.sin(a), 256 - 180 * Math.cos(a)); } }
  });
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(31, 31, 10, 64), [new THREE.MeshPhysicalMaterial({ color: 0x1a1b1e, roughness: 0.4, bumpMap: knurl, bumpScale: 0.8 }), new THREE.MeshPhysicalMaterial({ map: dialTex, roughness: 0.4 }), mat.rubber]);
  dial.rotation.x = Math.PI / 2; dial.position.set(0, 40, 28); mpg.add(dial);
  const crank = faceUp(lathe([[0.01, 0], [4, 0], [4, 12], [3.5, 14], [0.01, 14.5]], mat.chrome, 24)); crank.position.set(18, 52, 33); mpg.add(crank);
  const mpgStop = new THREE.Group();
  mpgStop.add(faceUp(lathe([[0.01, 0], [13, 0], [13, 6], [11, 9], [0.01, 9.5]], mat.red, 32)));
  mpgStop.position.set(-20, -62, 24); mpg.add(mpgStop);
  for (const [x, y] of [[18, -40], [18, -72]]) { const s2 = faceUp(lathe([[0.01, 0], [8, 0], [8, 7], [0.01, 7.5]], mat.knob, 24)); s2.position.set(x, y, 24); mpg.add(s2); }
  mpg.position.set(W / 2 + 46, 60, -10);
  mpg.rotation.z = 0.06;
  const hook = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 50), mat.chrome); hook.position.set(W / 2 + 8, 160, -20);
  group.add(mpg, hook);
  // coiled cable from the handwheel's base up to the pendant's side
  {
    const pts = [];
    const turns = 22, r0 = 9, len = 360;
    for (let i = 0; i <= turns * 24; i++) {
      const u = i / (turns * 24), a = u * turns * Math.PI * 2;
      const sag = Math.sin(u * Math.PI) * 120;
      pts.push(new THREE.Vector3(W / 2 + 40 + Math.cos(a) * r0 - u * 30, -40 - u * 0 - sag - (u < 0.5 ? u : 1 - u) * 0 + (u) * 10, -16 + Math.sin(a) * r0 - u * 40));
    }
    // start at the bottom of the handwheel, droop, then rise into the pendant side
    const curve = new THREE.CatmullRomCurve3(pts.map((p, i) => { const u = i / (pts.length - 1); p.y = -40 - Math.sin(u * Math.PI) * 170 + u * 10; p.x = W / 2 + 46 - u * 38 + (p.x - (W / 2 + 40 - u * 30)); return p; }));
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, turns * 24, 2.4, 8, false), mat.rubber);
    cable.castShadow = true; group.add(cable);
    void len;
  }

  // ---------------- the screen UI ----------------
  const MONO = '"Martian Mono", ui-monospace, monospace', WIDE = '"Hubot Sans", "Mona Sans", Arial, sans-serif';
  const C = { bg: '#06080b', panel: '#0c1015', line: '#1c2631', head: '#8597a8', text: '#e4eaf0', dim: '#66788a', run: '#79d08e', amber: '#f2b84b', red: '#ff5a45', sel: '#22313f' };
  const UI = {
    top: { x: 0, y: 0, w: 2048, h: 108 }, pos: { x: 24, y: 128, w: 820, h: 1148 }, prog: { x: 864, y: 128, w: 560, h: 1148 },
    spin: { x: 1444, y: 128, w: 580, h: 600 }, tool: { x: 1444, y: 748, w: 580, h: 528 }, msg: { x: 24, y: 1296, w: 2000, h: 96 }, soft: { x: 0, y: 1408, w: 2048, h: 128 },
  };
  // regions Marcel reads, in canvas px (used for the page-level overlay)
  const REGIONS = {
    load: { x: 1460, y: 196, w: 548, h: 300 }, block: { x: 300, y: 18, w: 520, h: 72 }, tool: { x: 1460, y: 800, w: 548, h: 300 },
    status: { x: 24, y: 1296, w: 760, h: 96 }, alarm0: { x: 40, y: 278, w: 1968, h: 84 }, toolT02: { x: 40, y: 362, w: 1968, h: 84 },
    screen: { x: 0, y: 0, w: 2048, h: 1536 }, free: { x: 52, y: 1010, w: 1200, h: 200 },
  };
  const box = (x, y, w, h, fill, stroke) => { const g = screenCtx; if (fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); } };
  const text = (s, x, y, font, color, align = 'left') => { const g = screenCtx; g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
  const fmt = (v, d = 4) => (v < 0 ? '-' : ' ') + Math.abs(v).toFixed(d);

  function drawTop(s) {
    box(0, 0, 2048, 108, '#0e141b');
    box(0, 106, 2048, 2, C.line);
    box(24, 22, 132, 64, s.held ? C.amber : C.run);
    text('MEM', 90, 71, `700 40px ${WIDE}`, '#081008', 'center');
    text('AUTO', 182, 71, `600 36px ${WIDE}`, C.head);
    text(`O1001  ${s.block}`, 320, 74, `500 46px ${MONO}`, C.text);
    text({ pos: 'POSITION', alarm: 'ALARM HISTORY', tool: 'TOOL LIFE', graph: 'GRAPH' }[s.page], 1180, 72, `600 38px ${WIDE}`, C.head, 'center');
    const secs = Math.floor(7 + s.clock) % 60, mins = 9 + Math.floor((7 + s.clock) / 60);
    text(`2026/11/02  17:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, 2020, 70, `400 34px ${MONO}`, C.dim, 'right');
  }
  function drawSoft(s) {
    const labels = ['POSITION', 'PROGRAM', 'OFFSET', 'TOOL LIFE', 'ALARM HIST', 'SETTING', 'GRAPH', 'HELP'];
    const active = { pos: 0, tool: 3, alarm: 4, graph: 6 }[s.page];
    const w = 2048 / 8;
    labels.forEach((l, i) => {
      box(i * w + 6, 1414, w - 12, 112, i === active ? '#c9d4de' : '#10161d', i === active ? null : C.line);
      text(l, i * w + w / 2, 1484, `600 32px ${WIDE}`, i === active ? '#0b0f14' : C.head, 'center');
    });
  }
  function drawMsg(s) {
    box(24, 1296, 2000, 96, '#0b1015', C.line);
    if (s.held) {
      const on = Math.floor(s.clock * 2) % 2 === 0;
      box(28, 1300, 520, 88, on ? C.amber : '#3a2c10');
      text('FEED HOLD', 288, 1362, `700 46px ${WIDE}`, on ? '#120c02' : C.amber, 'center');
      text('SPINDLE TURNING  ·  NO ALARM', 580, 1360, `500 34px ${MONO}`, C.text);
    } else {
      screenCtx.fillStyle = C.run; screenCtx.beginPath(); screenCtx.arc(66, 1344, 14, 0, 7); screenCtx.fill();
      text(s.resumed ? 'CYCLE RUNNING  ·  T02 COUNTER RESET TO 300' : 'CYCLE RUNNING', 100, 1360, `500 36px ${MONO}`, C.text);
    }
    text('NO ALARM', 2000, 1360, `500 32px ${MONO}`, C.dim, 'right');
  }
  function drawPos(s) {
    box(UI.pos.x, UI.pos.y, UI.pos.w, UI.pos.h, C.panel, C.line);
    text('ABSOLUTE', 52, 186, `600 34px ${WIDE}`, C.head);
    text('IN', 816, 186, `500 30px ${MONO}`, C.dim, 'right');
    const P = [['X', s.x], ['Y', s.y], ['Z', s.z]];
    P.forEach(([a, v], i) => {
      const y = 340 + i * 190;
      text(a, 60, y, `700 96px ${WIDE}`, C.head);
      text(fmt(v), 812, y, `400 128px ${MONO}`, C.text, 'right');
    });
    box(44, 820, 780, 2, C.line);
    text('MACHINE', 52, 880, `600 30px ${WIDE}`, C.head);
    text('DIST TO GO', 452, 880, `600 30px ${WIDE}`, C.head);
    [['X', s.x - 19.8787], ['Y', s.y - 10.0], ['Z', s.z - 12.0692]].forEach(([a, v], i) => {
      const y = 950 + i * 66;
      text(a, 52, y, `600 36px ${WIDE}`, C.dim); text(fmt(v), 400, y, `400 40px ${MONO}`, C.text, 'right');
      text(a, 452, y, `600 36px ${WIDE}`, C.dim); text(fmt(i === 0 ? (s.resumed ? 3.9 - s.x : s.x - 0.6) : 0), 800, y, `400 40px ${MONO}`, C.text, 'right');
    });
    text('G01 G17 G90 G94 G20 G40 G43 G80 G54', 52, 1180, `400 30px ${MONO}`, C.dim);
    text(`T02 H02 D00 M08  F${s.held ? '0.0' : '40.0'}`, 52, 1232, `400 30px ${MONO}`, C.dim);
  }
  function drawProg(s) {
    box(UI.prog.x, UI.prog.y, UI.prog.w, UI.prog.h, C.panel, C.line);
    text('PROGRAM', 892, 186, `600 34px ${WIDE}`, C.head);
    const cur = Math.max(0, PROGRAM.findIndex((l) => l.startsWith(s.block + ' ')));
    const start = Math.max(0, cur - 8);
    for (let i = 0; i < 17; i++) {
      const li = start + i; if (li >= PROGRAM.length) break;
      const y = 252 + i * 58;
      if (li === cur) box(872, y - 42, 544, 56, s.held ? '#3a2c10' : C.sel);
      const line = PROGRAM[li].length > 22 ? PROGRAM[li].slice(0, 22) : PROGRAM[li];
      text(line, 892, y, `400 33px ${MONO}`, li === cur ? (s.held ? C.amber : '#ffffff') : li < cur ? C.dim : '#aeb9c4');
    }
  }
  function drawSpin(s) {
    box(UI.spin.x, UI.spin.y, UI.spin.w, UI.spin.h, C.panel, C.line);
    text('SPINDLE LOAD', 1472, 186, `600 34px ${WIDE}`, C.head);
    const hot = s.load >= 85, col = s.load >= 100 ? C.red : hot ? C.amber : C.text;
    text(`${Math.round(s.load)}`, 1820, 372, `400 168px ${MONO}`, col, 'right');
    text('%', 1836, 372, `400 64px ${MONO}`, col);
    // bar with ticks: 0..150 %
    const bx = 1472, by = 410, bw = 520, bh = 46;
    box(bx, by, bw, bh, '#151c24');
    box(bx + (bw * 85) / 150, by, (bw * 15) / 150, bh, 'rgba(242,184,75,0.18)');
    box(bx + (bw * 100) / 150, by, (bw * 50) / 150, bh, 'rgba(255,90,69,0.16)');
    box(bx, by, (bw * Math.min(150, s.load)) / 150, bh, col);
    if (s.peak) {   // the load Marcel held at stays marked while the spindle idles
      const px = bx + (bw * Math.min(150, s.peak)) / 150;
      box(px - 5, by - 16, 10, bh + 32, C.amber);
      text(`PEAK ${Math.round(s.peak)}%`, px - 16, by - 24, `700 36px ${WIDE}`, C.amber, 'right');
    }
    for (let i = 0; i <= 6; i++) { const x = bx + (bw * i) / 6; box(x - 1, by + bh + 4, 2, 14, C.dim); text(String(i * 25), x, by + bh + 52, `400 26px ${MONO}`, C.dim, 'center'); }
    text(`S ${s.held ? 9000 : 9000} RPM`, 1472, 594, `400 40px ${MONO}`, C.text);
    text(`F ${s.held ? '0.0' : '40.0'} IN/MIN`, 1472, 656, `400 40px ${MONO}`, C.text);
    text('OVR  F100%  S100%', 1472, 712, `400 30px ${MONO}`, C.dim);
  }
  function drawTool(s) {
    box(UI.tool.x, UI.tool.y, UI.tool.w, UI.tool.h, C.panel, C.line);
    text('TOOL', 1472, 806, `600 34px ${WIDE}`, C.head);
    text(s.resumed ? 'T02' : 'T02', 1472, 930, `400 120px ${MONO}`, C.text);
    text('0.5 3FL ROUGH EM', 1472, 990, `400 36px ${MONO}`, '#aeb9c4');
    const used = s.resumed ? 0 : 263, left = 300 - used;
    text('LIFE (PARTS)', 1472, 1062, `600 30px ${WIDE}`, C.head);
    text(`${used} / 300`, 1472, 1124, `400 44px ${MONO}`, C.text);
    text(`${left} LEFT`, 1996, 1124, `500 44px ${MONO}`, left < 50 ? C.amber : C.run, 'right');
    box(1472, 1150, 524, 18, '#151c24'); box(1472, 1150, (524 * used) / 300, 18, left < 50 ? C.amber : C.run);
    text('NEXT T03', 1472, 1236, `400 30px ${MONO}`, C.dim);
  }
  function drawAlarm(s) {
    box(24, 128, 2000, 1148, C.panel, C.line);
    text('DATE / TIME', 52, 236, `600 32px ${WIDE}`, C.head); text('CODE', 700, 236, `600 32px ${WIDE}`, C.head); text('MESSAGE', 960, 236, `600 32px ${WIDE}`, C.head);
    box(40, 256, 1968, 2, C.line);
    ALARMS.forEach(([d, c, m], i) => {
      const y = 330 + i * 84;
      if (i === s.cursor) box(40, y - 52, 1968, 84, C.sel);
      text(d, 52, y, `400 38px ${MONO}`, C.text); text(c, 700, y, `500 38px ${MONO}`, c.startsWith('SP') ? C.amber : C.text); text(m, 960, y, `400 38px ${MONO}`, '#aeb9c4');
    });
    text('ALARM HISTORY  1-8 / 8   NEWEST FIRST', 52, 1240, `400 30px ${MONO}`, C.dim);
  }
  function drawToolLife(s) {
    box(24, 128, 2000, 1148, C.panel, C.line);
    const cols = [['TOOL', 52], ['DESCRIPTION', 230], ['LIFE', 1060], ['USED', 1300], ['REMAIN', 1540], ['STATUS', 1800]];
    cols.forEach(([h, x]) => text(h, x, 236, `600 32px ${WIDE}`, C.head));
    box(40, 256, 1968, 2, C.line);
    TOOLS.forEach(([t, d, life, used], i) => {
      const y = 330 + i * 84, rem = life - used, low = rem < 50;
      if (i === s.cursor) box(40, y - 52, 1968, 84, C.sel);
      text(t, 52, y, `500 40px ${MONO}`, C.text); text(d, 230, y, `400 38px ${MONO}`, '#aeb9c4');
      text(String(life), 1060, y, `400 38px ${MONO}`, C.text); text(String(used), 1300, y, `400 38px ${MONO}`, C.text);
      text(String(rem), 1540, y, `500 38px ${MONO}`, low ? C.amber : C.text); text(low ? 'LOW' : 'OK', 1800, y, `600 36px ${WIDE}`, low ? C.amber : C.run);
    });
    text('TOOL LIFE  COUNT BY PARTS', 52, 1240, `400 30px ${MONO}`, C.dim);
  }
  // GRAPH: spindle load on T02 over the last 40 s, the feed hold, and where the climb was heading
  function drawGraph(s) {
    const g = screenCtx;
    box(24, 128, 2000, 1148, C.panel, C.line);
    text('SPINDLE LOAD  %', 52, 200, `600 34px ${WIDE}`, C.head);
    text('T02   S9000   LAST 40 S', 2000, 200, `400 30px ${MONO}`, C.dim, 'right');
    const X0 = 170, X1 = 1960, Y0 = 1150, Y1 = 270, T0 = -32, T1 = 12, L1 = 150;
    const tx = (t) => X0 + ((t - T0) / (T1 - T0)) * (X1 - X0), ly = (l) => Y0 - (l / L1) * (Y0 - Y1);
    // grid and axes
    for (let l = 0; l <= 150; l += 25) { box(X0, ly(l) - 1, X1 - X0, 2, l === 100 ? '#3a2a24' : '#18212b'); text(String(l), X0 - 24, ly(l) + 11, `400 28px ${MONO}`, C.dim, 'right'); }
    for (let t = -30; t <= 10; t += 5) { box(tx(t) - 1, Y1, 2, Y0 - Y1, '#141c25'); text(t === 0 ? '0 S' : `${t > 0 ? '+' : ''}${t}`, tx(t), Y0 + 44, `400 28px ${MONO}`, t === 0 ? C.amber : C.dim, 'center'); }
    // block bands
    [['N250', -32, -21], ['N260', -21, -12], ['N270', -12, 0]].forEach(([b, a, z]) => { box(tx(a) + 2, Y1 - 46, tx(z) - tx(a) - 4, 34, '#111922'); text(b, (tx(a) + tx(z)) / 2, Y1 - 19, `500 26px ${MONO}`, b === 'N270' ? C.text : C.dim, 'center'); });
    // the run: steady cuts, then the climb from 72% at about 3.5 %/s, then the hold
    const load = (t) => {
      const w = Math.sin(t * 5.1) * 1.6 + Math.sin(t * 13.7) * 0.9 + Math.sin(t * 2.3) * 1.1;
      if (t < -21) return 46 + w;
      if (t < -12) return 58 + w;
      if (t < -6) return 71 + w * 0.8;
      if (t <= 0) return 72 + (t + 6) * 3 + w * 0.5;
      return Math.max(6, 90 - (t) * 150) + w * 0.25;
    };
    // heat colours: the trace tempers as the load climbs
    // steel grey while it cuts normally, then straw, bronze, violet and blue as the load climbs
    const heat = (l) => (l < 62 ? '#b7bfc8' : l < 76 ? '#ecd08a' : l < 81 ? '#e0ad55' : l < 85 ? '#c7853f' : l < 88 ? '#a8673f' : l < 91 ? '#8d5a9e' : '#5a84d6');
    g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
    let prev = null;
    for (let t = T0; t <= 10; t += 0.05) {
      const l = load(t), p = [tx(t), ly(l)];
      if (prev) { g.strokeStyle = heat(l); g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(p[0], p[1]); g.stroke(); }
      prev = p;
    }
    // where the climb was heading: about 8 s to overload
    g.setLineDash([18, 14]); g.lineWidth = 5; g.strokeStyle = 'rgba(255,90,69,0.85)';
    g.beginPath(); g.moveTo(tx(0), ly(90)); g.lineTo(tx(9), ly(90 + 9 * 3)); g.stroke(); g.setLineDash([]);
    g.strokeStyle = C.red; g.lineWidth = 6; const ox = tx(9), oy = ly(117);
    g.beginPath(); g.moveTo(ox - 18, oy - 18); g.lineTo(ox + 18, oy + 18); g.moveTo(ox + 18, oy - 18); g.lineTo(ox - 18, oy + 18); g.stroke();
    text('OVERLOAD', ox + 22, oy - 66, `700 30px ${WIDE}`, C.red, 'right'); text('PROJECTED', ox + 22, oy - 32, `500 26px ${WIDE}`, 'rgba(255,90,69,0.8)', 'right');
    // the hold
    box(tx(0) - 3, Y1, 6, Y0 - Y1, C.amber);
    box(tx(0) + 16, ly(90) - 40, 330, 64, '#2a200c');
    text('FEED HOLD  90%', tx(0) + 30, ly(90) + 4, `700 34px ${WIDE}`, C.amber);
    // the gap Marcel bought
    const gy = ly(140);
    box(tx(0), gy, tx(9) - tx(0), 3, C.text); box(tx(0), gy - 14, 3, 30, C.text); box(tx(9) - 3, gy - 14, 3, 30, C.text);
    text('9 S EARLY', (tx(0) + tx(9)) / 2, gy - 22, `600 32px ${WIDE}`, C.text, 'center');
  }
  let lastKey = '';
  function drawScreen(s) {
    const key = [s.page, s.block, Math.round(s.load), s.held, s.resumed, s.cursor, Math.floor(s.clock * 2), s.x.toFixed(3), s.y.toFixed(3), s.peak].join('|');
    if (key === lastKey) return; lastKey = key;
    const g = screenCtx;
    g.fillStyle = C.bg; g.fillRect(0, 0, SCREEN.px, SCREEN.py);
    drawTop(s);
    if (s.page === 'pos') { drawPos(s); drawProg(s); drawSpin(s); drawTool(s); }
    else if (s.page === 'alarm') drawAlarm(s);
    else if (s.page === 'graph') drawGraph(s);
    else drawToolLife(s);
    drawMsg(s); drawSoft(s);
    // faint LCD pixel grid and edge falloff, so it reads as a panel, not a flat image
    g.fillStyle = 'rgba(0,0,0,0.10)';
    for (let y = 0; y < SCREEN.py; y += 4) g.fillRect(0, y, SCREEN.px, 1);
    const vg = g.createRadialGradient(SCREEN.px / 2, SCREEN.py / 2, SCREEN.py * 0.45, SCREEN.px / 2, SCREEN.py / 2, SCREEN.px * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = vg; g.fillRect(0, 0, SCREEN.px, SCREEN.py);
    screenTex.needsUpdate = true;
  }

  const state = { page: 'pos', block: 'N270', load: 72, held: false, resumed: false, cursor: 0, clock: 0, x: 3.9, y: 3.25, z: -0.125, holdLamp: 0, startLamp: 1, peak: 0 };
  function update(next = {}) {
    Object.assign(state, next);
    drawScreen(state);
    startMat.emissiveIntensity = 0.02 + 1.15 * state.startLamp;
    holdMat.emissiveIntensity = 0.05 + 3.2 * state.holdLamp;
    // an unlit lens is dark coloured plastic, not a dimmer lamp
    startMat.color.setHex(state.startLamp > 0.5 ? 0x3fbf62 : 0x10301a);
    holdMat.color.setHex(state.holdLamp > 0.5 ? 0xf0a830 : 0x3a2a0e);
  }

  // world corners of a screen region (canvas px), for overlays drawn on the page
  const v = new THREE.Vector3();
  function regionCorners(name, out = []) {
    const r = REGIONS[name];
    const toLocal = (px, py) => [SCREEN.cx - SCREEN.w / 2 + (px / SCREEN.px) * SCREEN.w, SCREEN.cy + SCREEN.h / 2 - (py / SCREEN.py) * SCREEN.h];
    group.updateMatrixWorld();
    const pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
    pts.forEach(([px, py], i) => { const [lx, ly] = toLocal(px, py); out[i] = (out[i] || new THREE.Vector3()).set(lx, ly, SCREEN.z).applyMatrix4(group.matrixWorld); });
    return out;
  }
  function worldPoint(lx, ly, lz, target = v) { group.updateMatrixWorld(); return target.set(lx, ly, lz).applyMatrix4(group.matrixWorld); }
  const points = { holdButton: [-110, -292, 14], startButton: [-170, -292, 14], screenCenter: [0, SCREEN.cy, SCREEN.z], estop: [196, -286, 34] };

  update();
  return { group, update, state, regionCorners, worldPoint, points, screenTex, lcd, mat, W, H, DEPTH, REGIONS };
}
