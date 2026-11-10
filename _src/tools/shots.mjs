import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, outDir, w = '1440', h = '900', ...positions] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 700, isMobile: +w < 700 });
const page = await ctx.newPage();
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/KHR_parallel|PCFSoft/.test(m.text())) console.log('[console]', m.text().slice(0, 240)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:8765/site/index.html', { waitUntil: 'load' });
try { await page.waitForSelector('.stage.gl-on', { timeout: 90000 }); } catch { console.log('no gl-on'); }
for (const pos of positions) {
  // pos: "u:2.5" (stage units) or "#id" or "y:1234"
  let y;
  if (pos.startsWith('u:')) y = await page.evaluate((u) => { const s = document.querySelector('.stage'); return s.offsetTop + u * innerHeight; }, +pos.slice(2));
  else if (pos.startsWith('#')) y = await page.evaluate((id) => document.querySelector(id).getBoundingClientRect().top + scrollY, pos);
  else y = +pos.slice(2);
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(pos.startsWith('u:') ? 2600 : 3800);
  const name = pos.replace(/[^a-z0-9.]/gi, '_');
  await page.screenshot({ path: `${outDir}/${w}_${name}.png` });
  console.log('shot', name);
}
await browser.close();
