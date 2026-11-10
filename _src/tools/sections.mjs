import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, outDir, w = '1440', h = '900', motion = 'reduce', ...sels] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 700, isMobile: +w < 700, reducedMotion: motion });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) console.log('[console]', m.text().slice(0, 200)); });
await page.goto('http://127.0.0.1:8765/site/index.html', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const shots = [];
for (const sel of sels) {
  const [s, extra = '0'] = sel.split('+');
  const y = await page.evaluate(([s, extra]) => { const el = document.querySelector(s); return el.getBoundingClientRect().top + scrollY + Number(extra) - 64; }, [s, extra]);
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(motion === 'reduce' ? 700 : 3400);
  const name = `${outDir}/${w}_${sel.replace(/[^a-z0-9]/gi, '_')}.png`;
  await page.screenshot({ path: name });
  shots.push(name);
}
console.log(shots.join('\n'));
await browser.close();
