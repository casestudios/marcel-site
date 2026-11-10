// Render the reduced-motion stills: stage-N(.tall).webp and engrave(.tall).webp into media/
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const only = process.argv[2] || 'all';
fs.mkdirSync('media', { recursive: true });
fs.mkdirSync('posters-png', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const BASE = 'http://127.0.0.1:8765/site/index.html';
const toWebp = (png, out, q = 80) => execFileSync('python3', ['-c', `from PIL import Image; Image.open('${png}').convert('RGB').save('${out}', 'WEBP', quality=${q}, method=6)`]);
async function stage(name, u, vw, vh, dpr) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`${BASE}?poster&q=high&u=${u}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForSelector('.stage.gl-on', { timeout: 300000 });
  const f0 = await page.evaluate(() => window.__marcelStage.frames);
  await page.waitForFunction((f0) => window.__marcelStage.frames >= f0 + 2, f0, { timeout: 300000, polling: 300 });
  await page.waitForTimeout(2600);   // callouts finish plotting
  const f1 = await page.evaluate(() => { window.__marcelStage.paused = true; return window.__marcelStage.frames; });
  await page.waitForFunction((f1) => window.__marcelStage.frames >= f1 + 1, f1, { timeout: 300000, polling: 300 }).catch(() => {});
  await page.waitForTimeout(500);
  const png = `posters-png/${name}.png`;
  await page.locator('.stage-pin').screenshot({ path: png, timeout: 120000 });
  toWebp(png, `media/${name}.webp`);
  console.log('poster', name);
  await page.close();
}
async function engrave(name, vw, vh, dpr) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`${BASE}?engrave=99&q=high&noGL`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForSelector('.engrave.gl-on', { timeout: 300000 });
  await page.evaluate(() => document.documentElement.classList.add('poster-capture'));
  await page.waitForTimeout(3000);
  const png = `posters-png/${name}.png`;
  await page.locator('.engrave-media').screenshot({ path: png, timeout: 120000 });
  toWebp(png, `media/${name}.webp`, 82);
  console.log('poster', name);
  await page.close();
}
const U = [0, 0.95, 1.9, 3.25, 4.05];
if (only === 'all' || only === 'engrave') { await engrave('engrave', 1600, 900, 1.5); await engrave('engrave-tall', 540, 960, 2); }
if (only === 'tall') { for (let i = 1; i < U.length; i++) await stage(`stage-${i}-tall`, U[i], 540, 960, 2); }
if (only === 'all' || only === 'stage') {
  for (let i = 0; i < U.length; i++) await stage(`stage-${i}`, U[i], 1600, 900, 1.2);
  for (let i = 0; i < U.length; i++) await stage(`stage-${i}-tall`, U[i], 540, 960, 2);
}
await browser.close();
