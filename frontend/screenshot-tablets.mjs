import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_7IN = join(__dirname, 'screenshots', 'tablet-7in');
const OUT_10IN = join(__dirname, 'screenshots', 'tablet-10in');
const BASE_URL = 'http://localhost:8081';

const TABLETS = [
  { label: '7-inch', outDir: OUT_7IN, viewport: { width: 720, height: 1280 } },
  { label: '10-inch', outDir: OUT_10IN, viewport: { width: 1080, height: 1920 } },
];

const SCREENS = [
  { name: '01-dashboard', path: '/' },
  { name: '02-wallet', path: '/cards' },
  { name: '03-activity', path: '/history' },
  { name: '04-search', path: '/search' },
  { name: '05-insights', path: '/intelligence' },
  { name: '06-monthly', path: '/monthly-intelligence' },
  { name: '07-search-results', path: '/search/results?q=amazon' },
  { name: '08-profile', path: '/profile' },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  mkdirSync(OUT_7IN, { recursive: true });
  mkdirSync(OUT_10IN, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const tablet of TABLETS) {
    console.log(`\n——— ${tablet.label} Tablet (${tablet.viewport.width}x${tablet.viewport.height}) ———`);

    const page = await browser.newPage({
      viewport: tablet.viewport,
      deviceScaleFactor: 1,
    });

    // Mock API + inject auth
    await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], items: [], count: 0 }) }));
    await page.route('**:8000/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], items: [], count: 0 }) }));

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2000);
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'screenshot_token');
      localStorage.setItem('auth_user', JSON.stringify({ id: 'u1', email: 'u@ca.com', full_name: 'Rahul Sharma', role: 'user', terms_accepted: true, is_premium: false }));
      localStorage.setItem('smartcc_onboarding_complete', 'true');
      localStorage.setItem('smartcc_onboarding_persona', 'MAXIMIZE_REWARDS');
    });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(3000);

    for (const shot of SCREENS) {
      console.log(`  📸 ${shot.name}`);
      try {
        await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'networkidle', timeout: 20000 });
        await sleep(2000);
        await page.screenshot({ path: join(tablet.outDir, `${shot.name}.jpg`), type: 'jpeg', quality: 90 });
        console.log('     ✅');
      } catch (err) {
        console.log(`     ❌ ${err.message.slice(0, 60)}`);
      }
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nDone! 7-inch: ${OUT_7IN}/  |  10-inch: ${OUT_10IN}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
