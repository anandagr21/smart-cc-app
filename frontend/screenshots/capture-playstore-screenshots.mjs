import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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
    name: '07-dark-mode',
    src: '15-dark-analyze.jpg',
    title: 'Beautiful Dark Mode',
    sub: 'Easy on the eyes — day or night',
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
    background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #020617 100%);
  }
  .bg-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 80px 80px;
    mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 70%);
  }
  .phone {
    position: relative; z-index: 1;
    width: 420px; height: 860px;
    background: #0f172a;
    border-radius: 48px;
    border: 3px solid #334155;
    box-shadow: 0 0 80px rgba(139,92,246,0.15), 0 0 200px rgba(59,130,246,0.08);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .phone img {
    width: 100%; height: 100%;
    object-fit: cover;
    border-radius: 45px;
  }
  .caption {
    position: relative; z-index: 1;
    background: rgba(15,23,42,0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.1);
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
    <img src="./viewable/SCREENSHOT" alt="" />
  </div>
  <div class="caption">
    <h2>CAPTION_TITLE</h2>
    <p>CAPTION_SUB</p>
  </div>
</body>
</html>`;

for (const shot of screenshots) {
  const html = template
    .replace('SCREENSHOT', shot.src)
    .replace('CAPTION_TITLE', shot.title)
    .replace('CAPTION_SUB', shot.sub);

  const htmlPath = join(outDir, `${shot.name}.html`);
  writeFileSync(htmlPath, html);

  console.log(`Capturing ${shot.name}...`);
  try {
    execSync(
      `npx playwright screenshot --viewport-size="1080,1920" "${htmlPath}" "${join(outDir, shot.name + '.png')}"`,
      { stdio: 'pipe', cwd: __dirname }
    );
    console.log(`  ✓ ${shot.name}.png`);
  } catch (e) {
    console.error(`  ✗ ${shot.name} failed:`, e.message);
  }
}

console.log(`\nDone! ${screenshots.length} screenshots in ${outDir}/`);
