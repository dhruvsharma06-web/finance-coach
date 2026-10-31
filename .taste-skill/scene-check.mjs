import { Browser, sleep } from 'file:///C:/Users/ASUS/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
mkdirSync('.taste-skill/scenes', { recursive: true });
const browser = await Browser.launch();
try {
  for (const height of [844, 667]) {
    const page = await browser.newPage({ width: 390, height, mobile: true });
    await page.goto('http://localhost:3000');
    for (const progress of [0, .5, 1]) {
      await page.eval(progress => { const scene = document.querySelector('#story'); window.scrollTo(0, scene.offsetTop + progress * (scene.offsetHeight - innerHeight)); }, progress);
      await sleep(650);
      const geometry = await page.eval(() => { const copy = document.querySelector('.koshLanding_current').getBoundingClientRect(); const sheet = document.querySelector('[data-layer]').getBoundingClientRect(); return { copyBottom: copy.bottom, sheetTop: sheet.top, overflow: document.documentElement.scrollWidth > innerWidth }; });
      assert.equal(geometry.overflow, false);
      assert.ok(geometry.sheetTop >= geometry.copyBottom, `Overlap at ${height}/${progress}: ${JSON.stringify(geometry)}`);
      await page.screenshot({ path: `.taste-skill/scenes/mobile-${height}-${progress}.jpg` });
      console.log(height, progress, geometry);
    }
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'light' }] });
    await page.goto('http://localhost:3000/#story');
    assert.equal(await page.eval(() => [...document.querySelectorAll('.koshLanding_chapter')].filter(n => getComputedStyle(n).visibility === 'visible').length), 3);
    await page.screenshot({ path: `.taste-skill/scenes/reduced-light-${height}.jpg` });
    await page.goto('http://localhost:3000/login');
    await page.screenshot({ path: `.taste-skill/scenes/login-${height}.jpg` });
    await page.close();
  }
  console.log('Mobile scene start/midpoint/end, short viewport and reduced/light layout passed.');
} finally { await browser.close(); }
