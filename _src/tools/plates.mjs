import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, outDir, ...specs] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const spec of specs) {
  const [name, query, size] = spec.split('|');
  const [w, h] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:8765/lookdev/plate.html?${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log(name, `${Date.now() - t0}ms`);
  await page.close();
}
await browser.close();
