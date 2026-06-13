import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:19006';

const CREDENTIALS = {
  email: 'anandagr@test.com',
  password: 'anandagr@123',
};

// All screens to capture — ordered for natural navigation flow
const SCREENS = [
  // Login screen (captured first, before logging in)
  { name: '00-login', path: '/(auth)/login', description: 'Login screen' },

  // Tab screens (after login)
  { name: '01-analyze', path: '/', description: 'Analyze tab — main dashboard with AI insights' },
  { name: '02-wallet', path: '/cards', description: 'Wallet tab — credit cards inventory' },
  { name: '03-activity', path: '/history', description: 'Activity tab — transaction history' },
  { name: '04-profile', path: '/profile', description: 'Profile tab — user settings & preferences' },

  // Intelligence screens (modals over tabs)
  { name: '05-intelligence', path: '/intelligence', description: 'Transaction intelligence detail' },
  { name: '06-monthly-intelligence', path: '/monthly-intelligence', description: 'Monthly intelligence report' },

  // Search screens
  { name: '07-search', path: '/search', description: 'Search — merchant/product search' },
  { name: '08-search-results', path: '/search/results?q=amazon', description: 'Search results for "amazon"' },

  // Modal screens (settings-related)
  { name: '09-notifications', path: '/(modals)/notifications', description: 'Notifications preferences modal' },
  { name: '10-preferences', path: '/(modals)/preferences', description: 'App preferences modal' },
  { name: '11-security', path: '/(modals)/security', description: 'Security settings modal' },

  // Admin screens
  { name: '12-admin-catalog', path: '/admin/master-catalog', description: 'Admin — Master catalog' },
  { name: '13-admin-card-intelligence', path: '/admin/card-intelligence', description: 'Admin — Card intelligence dashboard' },
  { name: '14-admin-feedback', path: '/admin/feedback', description: 'Admin — User feedback' },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name, url, description) {
  const fullUrl = `${BASE_URL}${url}`;
  console.log(`📸 [${name}] → ${url}`);
  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2000); // Let animations finish

    const filePath = join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`   ✅ saved`);
    return { name, path: filePath, url: fullUrl, description, status: 'success' };
  } catch (err) {
    console.log(`   ❌ ${err.message.slice(0, 80)}`);
    return { name, path: null, url: fullUrl, description, status: 'error', error: err.message };
  }
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

  const results = [];

  // ================================================================
  // STEP 1: Screenshot the login screen BEFORE logging in
  // ================================================================
  console.log('——— Login Screen ———');
  await page.goto(`${BASE_URL}/(auth)/login`, { waitUntil: 'networkidle', timeout: 20000 });
  await sleep(3000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '00-login.png'), fullPage: false });
  console.log('📸 [00-login] → /(auth)/login');
  console.log('   ✅ saved');

  // ================================================================
  // STEP 2: Log in with real credentials
  // ================================================================
  console.log('\n——— Logging in ———');

  // Fill email
  const emailInput = page.locator('input[placeholder="name@example.com"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.click();
  await emailInput.fill(CREDENTIALS.email);
  console.log('   ✓ email filled');

  // Fill password
  const passwordInput = page.locator('input[placeholder="••••••••"]');
  await passwordInput.click();
  await passwordInput.fill(CREDENTIALS.password);
  console.log('   ✓ password filled');

  // Click Sign In
  const signInBtn = page.locator('text=Sign In').first();
  await signInBtn.click();
  console.log('   ✓ Sign In clicked');

  // Wait for redirect to tabs (the URL should change from /(auth)/login to /)
  await page.waitForURL(url => !url.pathname.includes('login'), { timeout: 20000 });
  await sleep(3000); // Let the home screen fully render
  console.log('   ✅ logged in, now on home screen\n');

  // ================================================================
  // STEP 3: Screenshot all screens
  // ================================================================
  console.log('——— Capturing All Screens ———\n');

  for (const screen of SCREENS.slice(1)) { // Skip login, already done
    const r = await takeScreenshot(page, screen.name, screen.path, screen.description);
    results.push(r);
  }

  // ================================================================
  // STEP 4: Dark mode screenshots
  // ================================================================
  console.log('\n——— Dark Mode Screens ———');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(1500);

  // Toggle to dark mode via localStorage, then reload
  // The theme store uses localStorage on web
  const currentTheme = await page.evaluate(() => localStorage.getItem('theme_mode'));
  console.log(`   current theme: ${currentTheme}`);

  await page.evaluate(() => localStorage.setItem('theme_mode', 'dark'));
  await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
  await sleep(3000);

  const darkScreens = [
    { name: '15-dark-analyze', path: '/', description: 'Dark mode — Analyze tab' },
    { name: '16-dark-wallet', path: '/cards', description: 'Dark mode — Wallet tab' },
  ];

  for (const screen of darkScreens) {
    const r = await takeScreenshot(page, screen.name, screen.path, screen.description);
    results.push(r);
  }

  // ================================================================
  // Done — write report
  // ================================================================
  await browser.close();

  const success = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');

  console.log('\n========================================');
  console.log(`SUMMARY: ${results.length} total | ✅ ${success.length} | ❌ ${failed.length}`);
  if (failed.length) {
    failed.forEach(f => console.log(`  ❌ ${f.name}: ${f.error?.slice(0, 60)}`));
  }

  writeFileSync(join(SCREENSHOTS_DIR, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2));
  console.log('manifest.json written\n');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
