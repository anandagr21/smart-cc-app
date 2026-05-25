const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500,
        timeout: 60000,
    });
    const page = await (await browser.newContext({
        viewport: { width: 1280, height: 900 },
    })).newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);

    const consoleEntries = [];
    const failedRequests = [];

    page.on('console', msg => {
        if (msg.type() === 'error') consoleEntries.push(`[ERROR] ${msg.text()}`);
        else if (msg.type() === 'warning') consoleEntries.push(`[WARN] ${msg.text()}`);
    });
    page.on('pageerror', err => consoleEntries.push(`[PAGE ERROR] ${err.message}`));
    page.on('requestfailed', req => failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText || 'unknown'}`));
    page.on('response', resp => {
        if (resp.status() >= 400 && resp.request().resourceType() !== 'image')
            failedRequests.push(`${resp.request().method()} ${resp.url()} — HTTP ${resp.status()}`);
    });

    // ========== NAVIGATE ==========
    console.log('=== NAVIGATE ===');
    await page.goto('http://localhost:8081/(auth)/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(10000); // Extra time for slow laptop hydration

    console.log('URL:', page.url());
    const bodyText = await page.evaluate(() => document.body.textContent?.substring(0, 600) || '');
    console.log('Body text:', bodyText);

    // ========== FILL FORM (use force:true for RNW inputs) ==========
    console.log('\n=== FILL FORM ===');

    // Find inputs
    const emailInput = page.locator('input[type="email"], input[inputmode="email"]').first();
    const pwInput = page.locator('input[type="password"]').first();
    console.log('Email inputs:', await emailInput.count());
    console.log('Password inputs:', await pwInput.count());

    // Click with force:true to bypass RNW visibility checks
    await emailInput.click({ force: true, timeout: 15000 });
    await emailInput.fill('anand@test.com', { force: true, timeout: 15000 });
    console.log('✓ Email filled');

    await pwInput.click({ force: true, timeout: 15000 });
    await pwInput.fill('anandagr@123', { force: true, timeout: 15000 });
    console.log('✓ Password filled');

    await page.waitForTimeout(1000);

    // ========== SUBMIT ==========
    console.log('\n=== SUBMIT ===');
    // Try multiple button finding strategies
    let clicked = false;

    // Strategy 1: Find by text
    const btnByText = page.locator('div[role="button"]').filter({ hasText: 'Sign In' }).first();
    if (await btnByText.count() > 0) {
        await btnByText.click({ force: true, timeout: 10000 });
        clicked = true;
        console.log('✓ Clicked Sign In (by role+text)');
    }

    // Strategy 2: Click any element containing "Sign In"
    if (!clicked) {
        const btnByContent = page.locator('*:has-text("Sign In")').last();
        if (await btnByContent.count() > 0) {
            await btnByContent.click({ force: true, timeout: 10000 });
            clicked = true;
            console.log('✓ Clicked Sign In (by text content)');
        }
    }

    // Strategy 3: Press Enter
    if (!clicked) {
        console.log('No button found, pressing Enter...');
        await pwInput.press('Enter');
        clicked = true;
    }

    // Wait for redirect
    console.log('Waiting 10s for redirect...');
    await page.waitForTimeout(10000);

    const finalUrl = page.url();
    const finalText = await page.evaluate(() => document.body.textContent?.substring(0, 600) || '');
    console.log('Final URL:', finalUrl);
    console.log('Final text:', finalText);

    // ========== REPORT ==========
    console.log('\n═══════════════════════════════════════');
    console.log('           FINAL REPORT');
    console.log('═══════════════════════════════════════');

    const errors = consoleEntries.filter(c => c.includes('ERROR') || c.includes('PAGE ERROR'));
    const warnings = consoleEntries.filter(c => c.includes('WARN'));
    const loginRendered = bodyText.includes('Email') || bodyText.includes('Sign In');
    const redirected = finalUrl.includes('(tabs)') || finalText.includes('Optimize') || finalText.includes('Wallet');
    const stayedOnLogin = finalText.includes('Sign In') && finalText.includes('Email');

    console.log('\n--- RESULTS ---');
    console.log('Login screen rendered:', loginRendered);
    console.log('Form fields found:', true); // We verified count > 0
    console.log('Sign In clicked:', clicked);
    console.log('Redirected to tabs:', redirected);
    console.log('Still on login:', stayedOnLogin);
    console.log('Console errors:', errors.length);
    console.log('Console warnings:', warnings.length);
    console.log('Network failures:', failedRequests.length);

    if (consoleEntries.length > 0) {
        console.log('\n--- Console Messages ---');
        consoleEntries.forEach(c => console.log(c));
    }
    if (failedRequests.length > 0) {
        console.log('\n--- Network Failures ---');
        failedRequests.forEach(f => console.log(f));
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Browser stays open. Close the window to finish.');
    await new Promise(() => { });
})();