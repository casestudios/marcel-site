// Screenshot tool for the build and for the critic.
//   node tools/shoot.mjs <outDir> '<json spec>'      (or a path to a .json file)
// spec = {
//   url: 'http://127.0.0.1:8765/site/index.html',   // optional
//   viewport: [1440, 900], dpr: 1, mobile: false,     // mobile=true adds touch + isMobile
//   shots: [ { name: 'hero', at: 'u:0' | 'u:1.7' | '#proof' | 'y:2400' | 'el:.phone' | 'top',
//              offset: 0,                 // extra px after resolving 'at' (e.g. -100 to see the section start)
//              clip: [x, y, w, h],        // optional crop in CSS px of the viewport (zoom in by also raising dpr)
//              element: '.selector',      // optional: screenshot just this element (after scrolling)
//              click: '.btn-reply',       // optional: click this first
//              wait: 1500 } ]             // extra wait in ms
// }
// Stage positions ('u:') wait for two fresh WebGL frames, so a slow software renderer still shows the right state.
import fs from 'node:fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [, , outDir, specArg] = process.argv;
const spec = JSON.parse(fs.existsSync(specArg) ? fs.readFileSync(specArg, 'utf8') : specArg);
fs.mkdirSync(outDir, { recursive: true });
const [w, h] = spec.viewport || [1440, 900];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: spec.dpr || 1, hasTouch: !!spec.mobile, isMobile: !!spec.mobile, reducedMotion: spec.reducedMotion ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 200)); });
await page.goto(spec.url || 'http://127.0.0.1:8765/site/index.html', { waitUntil: 'load', timeout: 120000 });
const gl = !spec.reducedMotion && await page.waitForSelector('.stage.gl-on', { timeout: 240000 }).then(() => true).catch(() => false);
if (!spec.reducedMotion && !gl) console.log('note: WebGL stage did not start (posters shown)');
const frames = () => page.evaluate(() => (window.__marcelStage ? window.__marcelStage.frames : 0));

for (const s of spec.shots) {
  const at = s.at || 'top';
  let y = 0;
  if (at === 'top') y = 0;
  else if (at.startsWith('u:')) y = await page.evaluate((u) => document.querySelector('.stage').offsetTop + u * innerHeight, +at.slice(2));
  else if (at.startsWith('cause:') || at === 'phone') {
    // story anchors measured by the page: cause:1..3 is the middle of that cause, phone is the phone step
    y = await page.evaluate((at) => { const A = window.__marcelStage && window.__marcelStage.A; const st = document.querySelector('.stage').offsetTop;
      if (!A) return st + 4 * innerHeight; const k = at === 'phone' ? -1 : +at.slice(6);
      const u = k < 0 ? A.phone : (A.c[k - 1] + A.c[k]) / 2; return st + u * innerHeight; }, at);
  }
  else if (at.startsWith('y:')) y = +at.slice(2);
  else if (at.startsWith('#') || at.startsWith('el:')) y = await page.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect().top + scrollY : 0; }, at.startsWith('#') ? at : at.slice(3));
  y += s.offset || 0;
  await page.evaluate((y) => { window.scrollTo(0, y); }, Math.max(0, y));
  await page.waitForTimeout(700);
  await page.evaluate((y) => { window.scrollTo(0, y); }, Math.max(0, y)); // a second set in case smooth scroll drifted
  if (s.click) { await page.click(s.click).catch((e) => console.log('click failed', e.message)); }
  if (gl) await page.evaluate(() => window.__marcelStage && window.__marcelStage.kick());
  if (gl && (at.startsWith('u:') || at.startsWith('cause:') || at === 'phone')) {
    const f0 = await frames();
    await page.waitForFunction((f0) => window.__marcelStage && window.__marcelStage.frames >= f0 + 2, f0, { timeout: 300000, polling: 250 }).catch(() => console.log('frame wait timed out'));
    await page.waitForTimeout(s.wait ?? 1400); // callouts plot in
    const f1 = await frames();
    await page.evaluate(() => { window.__marcelStage.paused = true; });
    await page.waitForFunction((f1) => window.__marcelStage.frames >= f1 + 1, f1, { timeout: 300000, polling: 250 }).catch(() => {});
    await page.waitForTimeout(400);
  } else {
    if (gl) await page.evaluate(() => { window.__marcelStage.paused = true; });
    await page.waitForTimeout(s.wait ?? 2200);
  }
  const file = `${outDir}/${s.name || at.replace(/[^a-z0-9.]/gi, '_')}.png`;
  if (s.element) await page.locator(s.element).first().screenshot({ path: file, timeout: 120000 });
  else await page.screenshot({ timeout: 120000, path: file, clip: s.clip ? { x: s.clip[0], y: s.clip[1], width: s.clip[2], height: s.clip[3] } : undefined });
  console.log('shot', file);
}
await browser.close();
