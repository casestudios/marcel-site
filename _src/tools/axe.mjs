import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import fs from 'node:fs';
const axe = fs.readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', isMobile: w < 700, hasTouch: w < 700 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('http://127.0.0.1:8765/site/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.addScriptTag({ content: axe });
  const res = await page.evaluate(async () => await window.axe.run(document, { resultTypes: ['violations'] }));
  console.log(`== ${w}px: ${res.violations.length} violation types`);
  for (const v of res.violations) {
    console.log(`- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`);
    for (const n of v.nodes.slice(0, 4)) console.log('    ', n.target.join(' '), '|', (n.failureSummary || '').split('\n').slice(1, 2).join(' ').slice(0, 160));
  }
  await ctx.close();
}
await browser.close();
