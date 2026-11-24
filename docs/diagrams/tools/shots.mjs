// Screenshots of the generated sketches: docs/diagrams/src/*.html -> public/diagrams/*.png
// Usage (from the repo root): node docs/diagrams/tools/shots.mjs
import { chromium } from '@playwright/test';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'docs/diagrams/src');
const out = path.join(root, 'public/diagrams');
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1532, height: 992 },
  deviceScaleFactor: 2,
});
for (const f of readdirSync(src)
  .filter((f) => f.endsWith('.html'))
  .sort()) {
  await page.goto('file://' + path.join(src, f));
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator('svg')
    .first()
    .screenshot({ path: path.join(out, f.replace(/\.html$/, '.png')) });
  console.log('shot', f);
}
await browser.close();
