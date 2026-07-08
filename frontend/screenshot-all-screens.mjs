import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots', 'viewable');
const BASE_URL = 'http://localhost:8081';

// Fake user injected into localStorage to bypass Google Sign-In
const FAKE_AUTH = {
  auth_token: 'screenshot_token_placeholder',
  auth_user: JSON.stringify({
    id: 'user-1',
    email: 'user@cardanalyser.com',
    full_name: 'Rahul Sharma',
    role: 'user',
    terms_accepted: true,
    is_premium: false,
  }),
};

const SCREENS = [
  { name: '00-login', path: '/(auth)/login', desc: 'Login screen' },
  { name: '01-analyze', path: '/', desc: 'Analyze — card recommendations' },
  { name: '02-wallet', path: '/cards', desc: 'Wallet — saved cards' },
  { name: '03-activity', path: '/history', desc: 'Activity — transaction history' },
  { name: '04-profile', path: '/profile', desc: 'Profile & settings' },
  { name: '05-intelligence', path: '/intelligence', desc: 'Transaction intelligence' },
  { name: '06-monthly-intelligence', path: '/monthly-intelligence', desc: 'Monthly intelligence report' },
  { name: '07-search', path: '/search', desc: 'Search merchants' },
  { name: '08-search-results', path: '/search/results?q=amazon', desc: 'Search results' },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log(`📁 Screenshots → ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  // ── Mock all API calls to prevent 401 → logout ────────────────────
  // Intercept requests to the backend API and return empty/200 responses
  await page.route('**/api/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], items: [], results: [], count: 0 }),
    });
  });

  // Also intercept port 8000 (local backend)
  await page.route('**:8000/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], items: [], results: [], count: 0 }),
    });
  });

  const results = [];

  // ── STEP 1: Login screen ──────────────────────────────────────────
  console.log('——— Login Screen ———');
  await page.goto(`${BASE_URL}/(auth)/login`, { waitUntil: 'networkidle', timeout: 20000 });
  await sleep(3000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '00-login.jpg'), type: 'jpeg', quality: 90 });
  console.log('📸 [00-login] ✅ saved\n');

  // ── STEP 2: Inject auth + skip onboarding ────────────────────
  console.log('——— Injecting Auth ———');
  await page.evaluate((auth) => {
    localStorage.setItem('auth_token', auth.auth_token);
    localStorage.setItem('auth_user', auth.auth_user);
    localStorage.setItem('smartcc_onboarding_complete', 'true');
    localStorage.setItem('smartcc_onboarding_persona', 'MAXIMIZE_REWARDS');
  }, FAKE_AUTH);
  console.log('   ✓ auth + onboarding skip injected\n');

  // ── STEP 3: Navigate home with auth ───────────────────────────────
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
  await sleep(4000);

  // ── STEP 4: Capture all screens ───────────────────────────────────
  console.log('——— Capturing Screens ———\n');
  for (const screen of SCREENS.slice(1)) {
    console.log(`📸 [${screen.name}] → ${screen.path}`);
    try {
      await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle', timeout: 20000 });
      await sleep(2500);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, `${screen.name}.jpg`), type: 'jpeg', quality: 90 });
      console.log('   ✅ saved');
      results.push({ name: screen.name, status: 'success' });
    } catch (err) {
      console.log(`   ❌ ${err.message.slice(0, 80)}`);
      results.push({ name: screen.name, status: 'error', error: err.message });
    }
  }

  await browser.close();

  const success = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');
  console.log(`\n========================================`);
  console.log(`SUMMARY: ${results.length} total | ✅ ${success.length} | ❌ ${failed.length}`);

  writeFileSync(join(SCREENSHOTS_DIR, 'manifest.json'), JSON.stringify({
    capturedAt: new Date().toISOString(),
    results,
  }, null, 2));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
