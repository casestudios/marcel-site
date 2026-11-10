import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, outDir, ...specs] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const spec of specs) {
  const [name, query, size] = spec.split('|');
  const [w, h] = (size || '1440x900').split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:8765/lookdev/index.html?${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 240000 });
  await page.screenshot({ path: `${outDir}/${name}.png` });
  const anchors = await page.evaluate(() => window.__anchors);
  console.log(name, `${Date.now() - t0}ms`, JSON.stringify(Object.fromEntries(Object.entries(anchors).map(([k, v]) => [k, [Math.round(v.x), Math.round(v.y)]]))));
  await page.close();
}
await browser.close();
