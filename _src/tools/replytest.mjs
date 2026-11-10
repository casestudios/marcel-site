import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
await page.goto('http://127.0.0.1:8765/preview/index.html');
await page.waitForSelector('.stage.gl-on', { timeout: 120000 });
await page.evaluate(() => { const s = document.querySelector('.stage'); window.scrollTo(0, s.offsetTop + 4 * innerHeight); });
await page.waitForTimeout(4000);
await page.click('.btn-reply');
await page.waitForTimeout(9000);
const st = await page.evaluate(() => ({
  you: !document.querySelector('.thread .you').hidden, late: !document.querySelector('.thread [data-late]').hidden,
  load: document.querySelector('[data-hud="load"]').textContent, block: document.querySelector('[data-hud="block"]').textContent,
  run: document.querySelector('[data-lamp="run"]').className, hudOpacity: document.querySelector('.hud').style.opacity,
}));
console.log(JSON.stringify(st));
await page.screenshot({ path: 'shots/reply_after.png' });
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
