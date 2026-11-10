// Try camera candidates on the live page: node tools/tune.mjs <outDir> <w> <h> '<json [{name,u,cam:{pos,look,fov,shiftX,shiftY}}]>'
import fs from 'node:fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [, , outDir, w, h, arg] = process.argv;
const list = JSON.parse(fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const mobile = +w < 700;
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:8765/site/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForSelector('.stage.gl-on', { timeout: 240000 });
for (const c of list) {
  const y = await page.evaluate((u) => document.querySelector('.stage').offsetTop + u * innerHeight, c.u);
  await page.evaluate(([y, cam]) => { window.scrollTo(0, y); window.__marcelStage.cam = cam || null; window.__marcelStage.kick(); }, [y, c.cam]);
  const f0 = await page.evaluate(() => window.__marcelStage.frames);
  await page.waitForFunction((f0) => window.__marcelStage.frames >= f0 + 2, f0, { timeout: 300000, polling: 250 });
  await page.waitForTimeout(c.wait ?? 1200);
  const f1 = await page.evaluate(() => { window.__marcelStage.paused = true; return window.__marcelStage.frames; });
  await page.waitForFunction((f1) => window.__marcelStage.frames >= f1 + 1, f1, { timeout: 300000, polling: 250 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/${c.name}.png`, timeout: 120000 });
  console.log('shot', c.name);
}
await browser.close();
