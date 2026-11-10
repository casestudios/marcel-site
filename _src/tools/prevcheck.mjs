import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, motion = 'reduce', w = '1440', h = '900'] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, reducedMotion: motion, isMobile: +w < 700, hasTouch: +w < 700 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
page.on('requestfailed', (r) => errs.push('failed: ' + r.url().slice(-60)));
await page.goto('http://127.0.0.1:8765/preview/index.html', { waitUntil: 'load' });
await page.waitForTimeout(motion === 'reduce' ? 1500 : 20000);
const st = await page.evaluate(() => ({
  fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
  gl: document.querySelector('.stage').classList.contains('gl-on'),
  drawing: document.querySelectorAll('.dw .pl').length,
  h1: getComputedStyle(document.querySelector('h1')).fontFamily,
}));
console.log(JSON.stringify(st));
await page.screenshot({ path: `shots/preview_${motion}_${w}.png` });
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
