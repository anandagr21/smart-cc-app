import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots', 'verify');
const BASE_URL = 'http://localhost:19006';

const CREDENTIALS = { email: 'anandagr@test.com', password: 'anandagr@123' };

const SCREENS = [
  { name: '00-onboarding', path: '/', description: 'Onboarding modal (first-time user)', needsFresh: true },
  { name: '01-analyze', path: '/', description: 'Analyze tab — Reward Efficiency renamed' },
  { name: '02-wallet', path: '/cards', description: 'Wallet tab' },
  { name: '03-activity', path: '/history', description: 'Activity tab — Analytics chip toggle' },
  { name: '04-profile', path: '/profile', description: 'Profile tab — Your Summary card' },
  { name: '05-search', path: '/search', description: 'Search' },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log(`📁 → ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const results = [];

  // --- Onboarding screenshot (fresh localStorage) ---
  console.log('——— Onboarding (fresh state) ———');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  // Don't set auth — we want to see what happens before login or clear onboarding state
  // Actually we need auth for the onboarding to show (it shows after login)
  // Let's set auth but clear onboarding
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'fake-token-for-screenshot');
    localStorage.setItem('auth_user', JSON.stringify({ id: 'u1', name: 'Alex', email: 'alex@test.com', terms_accepted: true }));
    localStorage.removeItem('smartcc_onboarding_complete'); // Fresh onboarding
    localStorage.setItem('theme_mode', 'light');
    localStorage.setItem('theme_hydrated', 'true');
  });
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
  await sleep(3000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '00-onboarding.png'), fullPage: false });
  console.log('   ✅ 00-onboarding.png');

  // Complete onboarding by clicking "Get Started"
  try {
    const getStarted = page.locator('text=Get Started').first();
    if (await getStarted.isVisible({ timeout: 3000 })) {
      await getStarted.click();
    } else {
      // Maybe on slide 1 — click Next twice
      const nextBtn = page.locator('text=Next');
      if (await nextBtn.isVisible({ timeout: 2000 })) {
        await nextBtn.click(); await sleep(500);
        await nextBtn.click(); await sleep(500);
        await page.locator('text=Get Started').click();
      }
    }
    await sleep(2000);
  } catch (e) { console.log('   ⚠️ Could not auto-dismiss onboarding:', e.message.slice(0, 60)); }

  // --- Login with real credentials for remaining screens ---
  console.log('\n——— Logging in ———');
  await page.goto(`${BASE_URL}/(auth)/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(2000);

  const emailInput = page.locator('input[placeholder="name@example.com"]');
  if (await emailInput.isVisible({ timeout: 5000 })) {
    await emailInput.fill(CREDENTIALS.email);
    await page.locator('input[placeholder="••••••••"]').fill(CREDENTIALS.password);
    await page.locator('text=Sign In').first().click();
    await page.waitForURL(url => !url.pathname.includes('login'), { timeout: 20000 });
    await sleep(3000);
    console.log('   ✅ logged in');
  } else {
    console.log('   ⚠️ Already logged in, continuing');
  }

  // --- Screenshot remaining screens ---
  for (const screen of SCREENS.slice(1)) {
    console.log(`📸 [${screen.name}] → ${screen.path}`);
    try {
      await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await sleep(2000);
      const fp = join(SCREENSHOTS_DIR, `${screen.name}.png`);
      await page.screenshot({ path: fp, fullPage: false });
      console.log(`   ✅ saved`);
      results.push({ name: screen.name, status: 'success', description: screen.description });
    } catch (err) {
      console.log(`   ❌ ${err.message.slice(0, 60)}`);
      results.push({ name: screen.name, status: 'error', error: err.message });
    }
  }

  await browser.close();
  console.log(`\nDone: ${results.filter(r=>r.status==='success').length}/${results.length} screenshots`);
  writeFileSync(join(SCREENSHOTS_DIR, 'verify-manifest.json'), JSON.stringify(results, null, 2));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
