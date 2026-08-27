// Render feature-graphic.html -> PNG at 1024x500 and report layout overflow.
// ponytail: throwaway QA script; delete after Play Console upload.
const { chromium } = require('/Users/anandagrawal/work/smart-cc-app/frontend/node_modules/playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.goto('file://' + path.resolve('scratch/feature-graphic/feature-graphic.html'));
  await page.waitForTimeout(2500); // fonts + glow render settle

  const audit = await page.evaluate(() => {
    const r = [];
    const vw = 1024, vh = 500;
    for (const el of document.querySelectorAll('h1, .sub, .tag, .brand-line, .icon-wrap')) {
      const b = el.getBoundingClientRect();
      const overflowX = b.right - vw;
      r.push({
        text: (el.textContent || '').trim().slice(0, 40),
        right: Math.round(b.right), bottom: Math.round(b.bottom),
        overflowX: overflowX > 0 ? Math.round(overflowX) : 0,
        overflowY: b.bottom - vh > 0 ? Math.round(b.bottom - vh) : 0,
        width: Math.round(b.width),
      });
    }
    // check brand-line vs tagline-row collision
    const bl = document.querySelector('.brand-line').getBoundingClientRect();
    const tr = document.querySelector('.tagline-row').getBoundingClientRect();
    r.push({ collision: bl.right > tr.left, gap: Math.round(tr.left - bl.right) });
    return r;
  });
  console.log(JSON.stringify(audit, null, 2));

  await page.screenshot({ path: 'scratch/feature-graphic/feature-graphic.png' });
  await browser.close();
  console.log('saved scratch/feature-graphic/feature-graphic.png');
})();
