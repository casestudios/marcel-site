import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, outDir, ...specs] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const spec of specs) {
  const [name, query, size] = spec.split('|');
  const [w, h] = (size || '1440x900').split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/KHR_parallel|GPU stall/.test(m.text())) console.log('[console]', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:8765/lookdev/stage.html?${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  await page.screenshot({ path: `${outDir}/${name}.png`, timeout: 300000 });
  console.log(name, `${Date.now() - t0}ms`);
  await page.close();
}
await browser.close();
