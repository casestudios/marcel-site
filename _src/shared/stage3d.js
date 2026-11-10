// stage3d.js: the shop at night. The operator pendant in front of a VMC whose window shows T02
// cutting; a separate studio scene holds the exploded tool. One renderer, one post chain.
import { buildToolRig, rng } from './toolrig.js';
import { buildPendant } from './pendant.js';

export function createStage(THREE, addons, opts = {}) {
  const { canvas, quality = 'high', preserveDrawingBuffer = false } = opts;
  const { RoundedBoxGeometry, EffectComposer, RenderPass, UnrealBloomPass, BokehPass, ShaderPass, OutputPass, RectAreaLightUniformsLib } = addons;
  const Q = quality === 'high';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !Q, alpha: false, preserveDrawingBuffer, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  if (RectAreaLightUniformsLib) RectAreaLightUniformsLib.init();

  // ======================= the shop =======================
  const shop = new THREE.Scene();
  shop.background = new THREE.Color(0x07080a);
  shop.fog = new THREE.FogExp2(0x07080a, 0.00006);

  // environment for reflections: dark room, overhead strips, the bright machine window
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x000000);
    const panel = (w, h, x, y, z, rx, ry, k, tint = [1, 1, 1]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k * tint[0], k * tint[1], k * tint[2]), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
    };
    const room = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 60), new THREE.MeshBasicMaterial({ color: 0x030304, side: THREE.BackSide })); env.add(room);
    for (const x of [-12, 0, 12]) panel(1.0, 14, x, 13, -2, Math.PI / 2, 0, 2.6, [1, 0.98, 0.94]);
    panel(10, 7, 9, 2, -9, 0, -0.5, 4.2, [0.86, 0.93, 1]);         // the machine window (behind, right)
    panel(1.2, 10, -16, 3, 6, 0, Math.PI / 2.4, 1.6);               // a far strip, left
    panel(20, 2.4, 0, -10, 14, -Math.PI / 3, 0, 0.12);              // floor bounce
    const pmrem = new THREE.PMREMGenerator(renderer);
    shop.environment = pmrem.fromScene(env, 0.02).texture;
    shop.environmentIntensity = 0.9;
    pmrem.dispose();
  }

  // --- the pendant ---
  const pendant = buildPendant(THREE, { RoundedBoxGeometry, quality });
  pendant.group.rotation.y = -0.2;
  shop.add(pendant.group);

  // --- the machine: front wall, door with a window, interior, spindle head, stack light ---
  const sheet = new THREE.MeshPhysicalMaterial({ color: 0x1a1c1f, metalness: 0.55, roughness: 0.5 });
  const sheetLight = new THREE.MeshPhysicalMaterial({ color: 0x8a8f95, metalness: 0.7, roughness: 0.42 });
  const machine = new THREE.Group();
  machine.position.set(0, 0, -470);
  shop.add(machine);
  {
    const WIN = { x0: 330, x1: 1450, y0: -260, y1: 560 };
    const front = new THREE.Shape();
    front.moveTo(-2200, -1300); front.lineTo(2000, -1300); front.lineTo(2000, 1250); front.lineTo(-2200, 1250); front.lineTo(-2200, -1300);
    const w = new THREE.Path(); const r = 40;
    w.moveTo(WIN.x0 + r, WIN.y0); w.lineTo(WIN.x1 - r, WIN.y0); w.quadraticCurveTo(WIN.x1, WIN.y0, WIN.x1, WIN.y0 + r); w.lineTo(WIN.x1, WIN.y1 - r); w.quadraticCurveTo(WIN.x1, WIN.y1, WIN.x1 - r, WIN.y1);
    w.lineTo(WIN.x0 + r, WIN.y1); w.quadraticCurveTo(WIN.x0, WIN.y1, WIN.x0, WIN.y1 - r); w.lineTo(WIN.x0, WIN.y0 + r); w.quadraticCurveTo(WIN.x0, WIN.y0, WIN.x0 + r, WIN.y0);
    front.holes.push(w);
    const frontGeo = new THREE.ExtrudeGeometry(front, { depth: 30, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 2, curveSegments: 12 });
    const frontMesh = new THREE.Mesh(frontGeo, sheet); frontMesh.position.z = -30; frontMesh.receiveShadow = true; machine.add(frontMesh);
    // door seams and a handle: the door is the panel around the window
    const seam = new THREE.MeshBasicMaterial({ color: 0x050506 });
    for (const x of [230, 1560]) { const s = new THREE.Mesh(new THREE.BoxGeometry(6, 1900, 2), seam); s.position.set(x, -100, 2); machine.add(s); }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(40, 620, 46), sheetLight); handle.position.set(280, 150, 26); handle.castShadow = true; machine.add(handle);
    // window frame gasket
    const gasket = new THREE.Mesh(new THREE.TorusGeometry(1, 1, 1, 1), sheet); void gasket;
    // window glass with coolant streaks
    const streak = (() => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 768; const g = c.getContext('2d');
      const r2 = rng(42);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, 1024, 768);
      for (let i = 0; i < 160; i++) { const x = r2() * 1024, y = r2() * 300, l = 80 + r2() * 420; const grd = g.createLinearGradient(x, y, x, y + l); grd.addColorStop(0, 'rgba(255,255,255,0.0)'); grd.addColorStop(0.2, `rgba(255,255,255,${0.06 + r2() * 0.12})`); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(x, y, 2 + r2() * 5, l); }
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${0.05 + r2() * 0.18})`; g.beginPath(); g.arc(r2() * 1024, r2() * 768, 0.6 + r2() * 3.4, 0, 7); g.fill(); }
      const t = new THREE.CanvasTexture(c); return t;
    })();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), new THREE.MeshPhysicalMaterial({ color: 0xbfd8e6, metalness: 0, roughness: 0.12, transparent: true, opacity: 0.22, alphaMap: streak, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false }));
    glass.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, -8); glass.renderOrder = 4; machine.add(glass);
    // interior: a lit sheet-metal box
    const inner = new THREE.Mesh(new THREE.BoxGeometry(1700, 1500, 1100), new THREE.MeshPhysicalMaterial({ color: 0x3b3f45, metalness: 0.55, roughness: 0.5, side: THREE.BackSide }));
    inner.position.set(900, 150, -590); inner.receiveShadow = true; machine.add(inner);
    // telescopic way cover on the back wall: stacked ribbed plates
    for (let i = 0; i < 9; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(1200, 46, 30 + i * 6), sheetLight);
      rib.position.set(900, -330 + i * 44, -1080 + i * 3); rib.receiveShadow = true; machine.add(rib);
    }
    // the cutting rig, scaled up so it reads through the glass
    const S = 3.0;
    const cut = buildToolRig(THREE, { quality, chips: true, work: true, vise: true });
    const cutRoot = new THREE.Group(); cutRoot.scale.setScalar(S); cutRoot.position.set(1180, -60, -380);
    cutRoot.add(cut.root, cut.work, cut.chipRoot);
    machine.add(cutRoot);
    // spindle head down to the holder
    const headY = (cut.STICK + 70) ;
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(58, 64, 520, 48), sheetLight);
    spindle.position.set(0, headY + 260 + 4, 0); cutRoot.add(spindle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(240, 360, 260), sheet); head.position.set(0, headY + 520 + 130, -20); cutRoot.add(head);
    // interior light: an LED bar in the ceiling
    const led = new THREE.SpotLight(0xeef4ff, 1.25e6, 3000, 0.62, 0.75, 1.7); led.position.set(980, 860, -160); led.target.position.set(1180, -80, -380);
    led.castShadow = true; led.shadow.mapSize.set(1024, 1024); led.shadow.bias = -0.0003; led.shadow.camera.near = 200; led.shadow.camera.far = 3000;
    machine.add(led, led.target);
    const amb = new THREE.RectAreaLight(0xcfdcf0, 0.9, 900, 120); amb.position.set(900, 860, -500); amb.lookAt(900, -300, -500); machine.add(amb);
    const ledStrip = new THREE.Mesh(new THREE.PlaneGeometry(500, 30), new THREE.MeshBasicMaterial({ color: 0xffffff })); ledStrip.position.set(700, 905, -200); ledStrip.rotation.x = Math.PI / 2; machine.add(ledStrip);
    // coolant line: a segmented hose bending down toward the tool
    {
      const hoseMat = new THREE.MeshPhysicalMaterial({ color: 0x1e2a36, metalness: 0.1, roughness: 0.4, clearcoat: 0.6 });
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(560, 640, -380), new THREE.Vector3(620, 420, -360), new THREE.Vector3(760, 200, -380), new THREE.Vector3(850, 30, -405)]);
      const n = 34;
      for (let i = 0; i <= n; i++) {
        const p = curve.getPoint(i / n), tng = curve.getTangent(i / n);
        const seg = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), hoseMat); seg.position.copy(p); seg.scale.set(1, 0.82, 1);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tng); seg.castShadow = true; machine.add(seg);
      }
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(6, 11, 40, 16), new THREE.MeshPhysicalMaterial({ color: 0xc87a2a, roughness: 0.4 }));
      tip.position.copy(curve.getPoint(1)).add(new THREE.Vector3(14, -18, -6)); tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangent(1)); machine.add(tip);
    }
    // window rim light reaching the pendant and the camera side
    const rim = new THREE.RectAreaLight(0xd6e6ff, 1.7, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); rim.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, 10); rim.lookAt(-300, 100, 900); machine.add(rim);
    // stack light on top of the cabinet
    const stack = new THREE.Group();
    const segs = [['green', 0x37c86a], ['amber', 0xf0a830], ['red', 0xe5402f]];
    const stackMats = {};
    segs.forEach(([k, hex], i) => {
      const m = new THREE.MeshPhysicalMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.05, transmission: 0, roughness: 0.3, transparent: true, opacity: 0.92 });
      stackMats[k] = m;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 66, 32), m); c.position.y = 40 + i * 70; stack.add(c);
    });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(36, 36, 16, 32), sheet); cap.position.y = 40 + 3 * 70 - 26; stack.add(cap);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 120, 16), sheetLight); pole.position.y = -40; stack.add(pole);
    stack.position.set(-260, 1250 + 60, 20); machine.add(stack);
    machine.userData = { cut, cutRoot, stackMats, WIN };
  }
  // floor: dark epoxy with a soft reflection
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, metalness: 0.2, roughness: 0.42 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1300; floor.receiveShadow = true; shop.add(floor);

  // lights on the pendant
  const screenLight = new THREE.RectAreaLight(0xcfe0ff, 1.6, 386, 290);
  screenLight.position.set(0, 182, -10); screenLight.lookAt(0, -300, 400);
  pendant.group.add(screenLight);
  const key = new THREE.SpotLight(0xfff4e6, 9e5, 4500, 0.42, 0.9, 1.6);
  key.position.set(-1400, 1700, 1400); key.target.position.set(0, -60, 0);
  key.castShadow = true; key.shadow.mapSize.set(Q ? 2048 : 1024, Q ? 2048 : 1024); key.shadow.bias = -0.0002; key.shadow.normalBias = 1.5;
  key.shadow.camera.near = 500; key.shadow.camera.far = 5000;
  shop.add(key, key.target);
  const fill = new THREE.DirectionalLight(0x9fb4c8, 0.12); fill.position.set(1200, 300, 1800); shop.add(fill);
  // a big soft key from the upper left, and a rim between the pendant and the machine
  const soft = new THREE.RectAreaLight(0xfff1e0, 11, 900, 600); soft.position.set(-1100, 900, 900); soft.lookAt(0, 0, 0); shop.add(soft);
  const rimP = new THREE.RectAreaLight(0xd9e6ff, 3.2, 300, 1200); rimP.position.set(420, 200, -260); rimP.lookAt(-600, 100, 900); shop.add(rimP);
  // dust in the window light, and a soft shaft of light leaving the glass
  {
    const r = rng(77), n = Q ? 700 : 250, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = 200 + r() * 1500; pos[i * 3 + 1] = -500 + r() * 1400; pos[i * 3 + 2] = -460 + r() * 1300; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dot = document.createElement('canvas'); dot.width = dot.height = 64; const dg = dot.getContext('2d');
    const gr = dg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); dg.fillStyle = gr; dg.fillRect(0, 0, 64, 64);
    const dust = new THREE.Points(geo, new THREE.PointsMaterial({ size: 3.2, map: new THREE.CanvasTexture(dot), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcfe0ff }));
    shop.add(dust);
    const shaftTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, 'rgba(210,225,255,0.55)'); grd.addColorStop(1, 'rgba(210,225,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 256, 256); const hx = g.createLinearGradient(0, 0, 256, 0); hx.addColorStop(0, 'rgba(0,0,0,1)'); hx.addColorStop(0.5, 'rgba(0,0,0,0)'); hx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = hx; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
    for (let i = 0; i < 3; i++) {
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1500), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.08 + i * 0.02, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      shaft.position.set(880 - i * 120, 140, -460 + 700); shaft.rotation.set(-Math.PI / 2 + 0.12, 0, 0.18 * (i - 1));
      shop.add(shaft);
    }
  }

  // ======================= the studio (exploded tool) =======================
  // Lit like a product shot: one big soft key overhead, two strip rims behind, a dark floor that takes a soft shadow.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x09090a);
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x000000);
    const panel = (w, h, x, y, z, rx, ry, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m); };
    panel(14, 7, 0, 10, 2, Math.PI / 2, 0, 2.6);            // overhead softbox
    panel(1.2, 14, -12, 1, -4, 0, Math.PI / 2.4, 3.4);      // strip, back left
    panel(1.0, 14, 12, 1, -5, 0, -Math.PI / 2.4, 2.6);      // strip, back right
    panel(8, 3, 0, 2, 14, 0, 0, 0.55);                      // faint fill from the camera side
    panel(30, 1.2, 0, -6, 0, -Math.PI / 2, 0, 0.18);        // floor bounce
    const pmrem = new THREE.PMREMGenerator(renderer);
    studio.environment = pmrem.fromScene(env, 0.02).texture;
    studio.environmentIntensity = 0.55;
    pmrem.dispose();
    if (RectAreaLightUniformsLib) {
      const key = new THREE.RectAreaLight(0xffffff, 1.6, 900, 420); key.position.set(-60, 520, 260); key.lookAt(0, 0, 0); studio.add(key);
      const rimL = new THREE.RectAreaLight(0xe8eeff, 3.2, 70, 900); rimL.position.set(-620, 140, -380); rimL.lookAt(0, 0, 0); studio.add(rimL);
      const rimR = new THREE.RectAreaLight(0xfff4e8, 2.4, 70, 900); rimR.position.set(640, 160, -340); rimR.lookAt(0, 0, 0); studio.add(rimR);
    }
    const sun = new THREE.DirectionalLight(0xffffff, 0.3); sun.position.set(-80, 900, 220); sun.target.position.set(0, 0, 0);
    sun.castShadow = false; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -0.0004;
    Object.assign(sun.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 100, far: 2400 });
    studio.add(sun, sun.target);
    // backdrop: a soft pool of light behind the tool
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    const grd = g.createRadialGradient(300, 230, 10, 280, 260, 330); grd.addColorStop(0, '#26272b'); grd.addColorStop(0.5, '#141517'); grd.addColorStop(1, '#09090a');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(4200, 2600), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, depthWrite: false })); back.position.set(0, 60, -1100); back.renderOrder = -1; studio.add(back);
    // floor that only shows the shadow
  }
  const open = buildToolRig(THREE, { quality, chips: false, work: false, packed: true });
  open.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  studio.add(open.root);

  // ======================= camera and post =======================
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 10, 20000);
  const composer = EffectComposer ? new EffectComposer(renderer) : null;
  let renderPass, bokeh, bloom, grain;
  if (composer) {
    renderPass = new RenderPass(shop, camera); composer.addPass(renderPass);
    if (Q && BokehPass) { bokeh = new BokehPass(shop, camera, { focus: 1400, aperture: 0.0000035, maxblur: 0.008 }); composer.addPass(bokeh); }
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.55, 0.86); composer.addPass(bloom);
    grain = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.010 }, uVig: { value: 0.32 }, uCA: { value: 0.0012 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig, uCA; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 0.0) * 43758.5453); }
        void main(){
          vec2 c = vUv - 0.5; float d = dot(c, c);
          vec3 col; col.r = texture2D(tDiffuse, vUv + c * uCA).r; col.g = texture2D(tDiffuse, vUv).g; col.b = texture2D(tDiffuse, vUv - c * uCA).b;
          col *= 1.0 - uVig * smoothstep(0.08, 0.62, d);
          float n = h(vUv * vec2(1931.0, 1171.0) + fract(uTime * 7.13)) - 0.5;
          col += n * uGrain * (0.35 + 0.65 * (1.0 - col));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    composer.addPass(grain);
    composer.addPass(new OutputPass());
  }

  let active = 'shop', W = 1, H = 1;
  const LOOK = { shop: { exposure: 1.2, bloom: 0.5, threshold: 0.86, aperture: 0.0000035 }, studio: { exposure: 1.08, bloom: 0.1, threshold: 0.97, aperture: 0.0000012 } };
  function setScene(name) {
    active = name;
    const sc = name === 'shop' ? shop : studio;
    if (renderPass) renderPass.scene = sc;
    if (bokeh) { bokeh.scene = sc; bokeh.uniforms.aperture.value = LOOK[name].aperture; }
    renderer.toneMappingExposure = LOOK[name].exposure;
    if (bloom) { bloom.strength = LOOK[name].bloom; bloom.threshold = LOOK[name].threshold; }
  }
  // shiftX moves the film (legacy keyframes); viewX/viewY move the view window as fractions of the frame
  function setCamera({ pos, look, fov = 30, shiftX = 0, shiftY = 0, viewX = 0, viewY = 0, focus = null, aperture = null }) {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(look[0], look[1], look[2]);
    camera.fov = fov;
    camera.filmOffset = shiftX * camera.getFilmWidth() * 0.5;
    const ox = viewX * W, oy = (viewY + shiftY) * H;
    if (ox || oy) camera.setViewOffset(W, H, ox, oy, W, H); else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    if (bokeh) {
      const f = focus != null ? focus : camera.position.distanceTo(new THREE.Vector3(...look));
      bokeh.uniforms.focus.value = f;
      bokeh.uniforms.aperture.value = aperture != null ? aperture : LOOK[active].aperture;
    }
  }
  // frame a set of world points into a rectangle of the screen (fractions of the frame), from a direction
  const _v = new THREE.Vector3(), _c = new THREE.PerspectiveCamera();
  function fit(points, { dir, fov = 24, rect = [0.45, 0.14, 0.96, 0.88], up = [0, 1, 0] }) {
    const center = new THREE.Vector3(); for (const p of points) center.add(p); center.multiplyScalar(1 / points.length);
    const d = new THREE.Vector3(...dir).normalize();
    _c.fov = fov; _c.aspect = W / H; _c.near = 1; _c.far = 20000; _c.up.set(...up); _c.updateProjectionMatrix();
    let dist = 900, ndc = null;
    for (let k = 0; k < 6; k++) {
      _c.position.copy(center).addScaledVector(d, dist); _c.lookAt(center); _c.updateMatrixWorld(); _c.updateProjectionMatrix();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of points) { _v.copy(p).project(_c); x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y); }
      ndc = [x0, x1, y0, y1];
      const tw = (rect[2] - rect[0]) * 2, th = (rect[3] - rect[1]) * 2;
      const s = Math.max((x1 - x0) / tw, (y1 - y0) / th);
      dist *= 0.35 + 0.65 * s;
    }
    const [x0, x1, y0, y1] = ndc;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const tcx = (rect[0] + rect[2]) - 1, tcy = 1 - (rect[1] + rect[3]);
    return { pos: _c.position.toArray(), look: center.toArray(), fov, viewX: -(tcx - cx) / 2, viewY: (tcy - cy) / 2, focus: dist };
  }
  function setStack(kind) {
    const m = machine.userData.stackMats;
    for (const k of Object.keys(m)) m[k].emissiveIntensity = k === kind ? 3.2 : 0.04;
  }
  function resize(w, h, dpr = 1) {
    W = w; H = h;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(w, h); }
  }
  let frameNo = 0;
  function render() {
    frameNo++;
    if (grain) grain.uniforms.uTime.value = frameNo * 0.016;
    if (composer) composer.render(); else renderer.render(active === 'shop' ? shop : studio, camera);
  }
  function project(v3) {
    const v = v3.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, z: v.z };
  }
  function compile() {
    const p1 = renderer.compileAsync ? renderer.compileAsync(shop, camera) : Promise.resolve(renderer.compile(shop, camera));
    const p2 = renderer.compileAsync ? renderer.compileAsync(studio, camera) : Promise.resolve(renderer.compile(studio, camera));
    return Promise.all([p1, p2]);
  }
  setStack('green');
  setScene('shop');
  return { renderer, camera, shop, studio, pendant, cut: machine.userData.cut, open, machine, setScene, setCamera, setStack, resize, render, project, compile, fit, get active() { return active; } };
}
