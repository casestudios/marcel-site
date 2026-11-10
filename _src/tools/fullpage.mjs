import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, out, w = '1440', h = '900', from = '#connect'] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 700, isMobile: +w < 700, reducedMotion: 'reduce' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:8765/site/index.html', { waitUntil: 'load' });
await page.waitForTimeout(1500);
// screenshot from the section down to the end, as one tall image
const top = await page.evaluate((sel) => document.querySelector(sel).getBoundingClientRect().top + scrollY, from);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
await page.setViewportSize({ width: +w, height: Math.min(16000, total - top) });
await page.evaluate((y) => window.scrollTo(0, y), top);
await page.waitForTimeout(1200);
await page.screenshot({ path: out, fullPage: false });
console.log('height', total - top);
await browser.close();
