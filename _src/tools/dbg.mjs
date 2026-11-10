import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:8765/site/index.html');
await page.waitForSelector('.stage.gl-on', { timeout: 90000 });
await page.evaluate(() => { const s = document.querySelector('.stage'); window.scrollTo(0, s.offsetTop + 1.8 * innerHeight); });
await page.waitForTimeout(3000);
const lamps = await page.evaluate(() => ({ run: document.querySelector('[data-lamp="run"]').className, hold: document.querySelector('[data-lamp="hold"]').className, feed: document.querySelector('[data-hud="feed"]').textContent, n: document.querySelectorAll('[data-lamp]').length }));
console.log(lamps);
await page.screenshot({ path: 'shots/dbg_hold.png' });
const info = await page.evaluate(() => Array.from(document.querySelectorAll('.callouts .co')).map((g) => {
  const t = g.querySelector('g'); const p = t.querySelector('path'); const bb = t.getBBox();
  return { op: g.style.opacity, tr: t.getAttribute('transform'), bb: [bb.x, bb.y, bb.width, bb.height].map(Math.round), d: p.getAttribute('d').slice(0, 80), dash: p.style.strokeDasharray, off: p.style.strokeDashoffset, cls: p.getAttribute('class') };
}));
console.log(JSON.stringify(info, null, 1));
await browser.close();
