import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'playstore');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const screenshots = [
  {
    name: '01-dashboard',
    src: '01-analyze.jpg',
    title: 'AI-Powered Recommendations',
    sub: 'Instantly see which card to use for every purchase',
  },
  {
    name: '02-wallet',
    src: '02-wallet.jpg',
    title: 'Your Card Wallet',
    sub: 'Track 79 Indian credit cards from 20+ banks',
  },
  {
    name: '03-transactions',
    src: '03-activity.jpg',
    title: 'Optimization Tracking',
    sub: 'See exactly how much you save with every transaction',
  },
  {
    name: '04-search',
    src: '07-search.jpg',
    title: 'Find Any Merchant',
    sub: 'Smart search with automatic category detection',
  },
  {
    name: '05-insights',
    src: '05-intelligence.jpg',
    title: 'AI-Powered Insights',
    sub: 'Personalized spending patterns and reward opportunities',
  },
  {
    name: '06-monthly',
    src: '06-monthly-intelligence.jpg',
    title: 'Monthly Intelligence Reports',
    sub: 'Track optimization rate and forecast savings',
  },
  {
    name: '07-search-results',
    src: '08-search-results.jpg',
    title: 'Smart Merchant Search',
    sub: 'Find any store or category with auto-suggestions',
  },
  {
    name: '08-profile',
    src: '04-profile.jpg',
    title: 'Your Optimization Profile',
    sub: 'Simplify, maximize rewards, or avoid fees — you choose',
  },
];

const template = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1920px;
    overflow: hidden;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 48px;
  }
  .bg {
    position: absolute; inset: 0;
    background: linear-gradient(160deg, #060F1A 0%, #0C1A2B 50%, #060F1A 100%);
  }
  .bg-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(20,184,166,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(20,184,166,0.04) 1px, transparent 1px);
    background-size: 80px 80px;
    mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 70%);
  }
  .phone {
    position: relative; z-index: 1;
    width: 390px; height: 844px;
    background: #0C1A2B;
    border-radius: 48px;
    border: 3px solid rgba(20,184,166,0.12);
    box-shadow: 0 0 80px rgba(20,184,166,0.10), 0 0 200px rgba(20,184,166,0.04);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .phone img {
    width: 100%; height: 100%;
    object-fit: fill;
    border-radius: 45px;
  }
  .caption {
    position: relative; z-index: 1;
    background: rgba(12,26,43,0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(20,184,166,0.10);
    border-radius: 16px;
    padding: 20px 36px;
    text-align: center;
    max-width: 640px;
  }
  .caption h2 {
    font-size: 30px; font-weight: 800;
    color: #fff;
    margin-bottom: 4px;
    letter-spacing: -0.01em;
  }
  .caption p {
    font-size: 20px; font-weight: 500;
    color: #94a3b8;
  }
</style>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="bg"></div>
  <div class="bg-grid"></div>
  <div class="phone">
    <img src="IMAGE_SRC" alt="" />
  </div>
  <div class="caption">
    <h2>CAPTION_TITLE</h2>
    <p>CAPTION_SUB</p>
  </div>
</body>
</html>`;

const browser = await chromium.launch();

for (const shot of screenshots) {
  const imgSrc = join(__dirname, 'viewable', shot.src);
  const html = template
    .replace('IMAGE_SRC', `file://${imgSrc}`)
    .replace('CAPTION_TITLE', shot.title)
    .replace('CAPTION_SUB', shot.sub);

  const htmlPath = join(outDir, `${shot.name}.html`);
  writeFileSync(htmlPath, html);

  console.log(`Capturing ${shot.name}...`);
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto(`file://${htmlPath}`);
  await page.waitForTimeout(1500); // let fonts and image load
  await page.screenshot({ path: join(outDir, `${shot.name}.png`), type: 'png' });
  await page.close();
  console.log(`  ✓ ${shot.name}.png`);
}

await browser.close();
console.log(`\nDone! ${screenshots.length} screenshots in ${outDir}/`);
