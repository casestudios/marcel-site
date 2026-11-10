import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 200)));
await page.goto('http://127.0.0.1:8765/film/index.html');
await page.waitForFunction(() => window.__timelines && window.__timelines.main, null, { timeout: 60000 });
const res = await page.evaluate(() => {
  const tl = window.__timelines.main; tl.seek(2.5);
  return Array.from(document.querySelectorAll('#marks g')).map((g) => ({ op: getComputedStyle(g).opacity, attr: g.getAttribute('opacity'), bb: (() => { const b = g.getBBox(); return [b.x, b.y, b.width, b.height].map(Math.round); })(), lead: g.querySelector('.lead').getAttribute('d').slice(0, 60) }));
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
