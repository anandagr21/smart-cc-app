/**
 * Monthly Intelligence Experience — QA Screenshot Capture
 * 
 * Usage:
 *   node scratch/monthly_intelligence_qa.js
 * 
 * Requires: Expo web server running at http://localhost:8081
 */

const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:8081';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'brain', 'screenshots');
const CREDENTIALS = { email: 'anand@test.com', password: 'password123' };

(async () => {
    console.log('🚀 Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    try {
        // ── Step 1: Navigate to app ──────────────────────────────────
        console.log(`📄 Navigating to ${BASE}...`);
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        // ── Step 2: Authenticate ─────────────────────────────────────
        const currentUrl = page.url();
        console.log(`   Current URL: ${currentUrl}`);

        if (currentUrl.includes('/login') || currentUrl.includes('(auth)')) {
            console.log('🔑 On login screen, attempting authentication...');

            // Fill email
            const emailInput = page.locator('input[type="email"], input[inputmode="email"]').first();
            try {
                await emailInput.waitFor({ state: 'visible', timeout: 10000 });
                await emailInput.click({ force: true });
                await emailInput.fill(CREDENTIALS.email, { force: true });
                console.log(`   ✏️ Filled email: ${CREDENTIALS.email}`);
            } catch (e) {
                console.log('   ⚠️ Could not find email input, trying broader selector...');
                const anyInput = page.locator('input').first();
                await anyInput.waitFor({ state: 'visible', timeout: 10000 });
                await anyInput.click({ force: true });
                await anyInput.fill(CREDENTIALS.email, { force: true });
            }

            // Fill password
            await page.waitForTimeout(500);
            const pwInput = page.locator('input[type="password"]').first();
            try {
                await pwInput.waitFor({ state: 'visible', timeout: 10000 });
                await pwInput.click({ force: true });
                await pwInput.fill(CREDENTIALS.password, { force: true });
                console.log('   ✏️ Filled password');
            } catch (e) {
                console.log('   ⚠️ Could not find password input');
            }

            // Click Sign In
            const signInBtn = page.getByText(/Sign In/i).first();
            await signInBtn.waitFor({ state: 'visible', timeout: 5000 });
            await signInBtn.click({ force: true });
            console.log('   🔘 Clicked Sign In');

            // Wait for redirect
            await page.waitForTimeout(5000);
            console.log(`   Post-login URL: ${page.url()}`);
        } else if (currentUrl.includes('(tabs)') || currentUrl === `${BASE}/`) {
            console.log('🔑 Already authenticated (no login redirect)');
        }

        // ── Step 3: Navigate to Monthly Intelligence ─────────────────
        console.log(`📊 Navigating to ${BASE}/monthly-intelligence...`);
        await page.goto(`${BASE}/monthly-intelligence`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        // Wait longer for API calls to resolve
        console.log('⏳ Waiting for data to load...');
        await page.waitForTimeout(5000);

        // ── Step 4: Take screenshot ─────────────────────────────────────
        const screenshotPath = path.join(SCREENSHOT_DIR, 'monthly_intelligence_qa.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);

        // Also dump page text content for verification
        const bodyText = await page.locator('body').innerText().catch(() => '(could not read)');
        console.log('\n📋 Page text content (first 2000 chars):');
        console.log(bodyText.substring(0, 2000));

        console.log('\n✅ QA screenshot capture complete.');

    } catch (error) {
        console.error('❌ Error during QA:', error.message);
        // Take error screenshot
        try {
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'monthly_intelligence_qa_error.png'), fullPage: true });
        } catch (_) { }
    } finally {
        await browser.close();
        console.log('🔒 Browser closed.');
    }
})();