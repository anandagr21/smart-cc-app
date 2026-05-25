const { chromium } = require('playwright');

const EMAIL = 'anand@test.com';
const PASSWORD = 'anandagr@123';
const BASE = 'http://localhost:8081';

function log(msg) { console.log(msg); }
function divider() { console.log('─'.repeat(60)); }

async function run() {
    log('\n🚀 Launching headed Chromium...\n');
    const browser = await chromium.launch({ headless: false, slowMo: 200 });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // Collect console messages
    const consoleMsgs = [];
    page.on('console', msg => {
        consoleMsgs.push({ type: msg.type(), text: msg.text() });
    });

    // Collect failed requests
    const failedReqs = [];
    page.on('requestfailed', req => {
        failedReqs.push({ url: req.url(), failure: req.failure()?.errorText });
    });

    // ── STEP 1: Navigate to login ──
    log('=== STEP 1: NAVIGATE TO LOGIN ===');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    // Wait for hydration: "Smart CC Intelligence" text or "Sign In" text must appear
    await page.waitForSelector('text=Smart CC Intelligence', { timeout: 15000 }).catch(() => { });
    await page.waitForSelector('text=Sign In', { timeout: 15000 }).catch(() => { });
    await page.waitForTimeout(3000);
    log(`URL: ${page.url()}`);
    log(`Body text excerpt: ${(await page.locator('body').innerText()).substring(0, 200)}`);

    // ── STEP 2: Fill login form ──
    log('\n=== STEP 2: FILL FORM ===');
    // Email: first input with autocomplete="email" or autocapitalize="none"
    const emailInput = page.locator('input').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(EMAIL);
    log('✓ Email filled');

    // Password: input with secure text entry (type="password" in web)
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.fill(PASSWORD);
    log('✓ Password filled');
    await page.waitForTimeout(500);

    // ── STEP 3: Click Sign In ──
    log('\n=== STEP 3: CLICK SIGN IN ===');
    // The Button component renders TouchableOpacity which is [role="button"] in RN Web.
    // The "Sign In" text is inside a nested Text element.
    // Try multiple locators:
    let signInBtn = page.locator('div[role="button"]').filter({ hasText: 'Sign In' }).first();
    let btnCount = await signInBtn.count();
    log(`[role="button"] with "Sign In": ${btnCount}`);

    if (btnCount === 0) {
        signInBtn = page.getByText('Sign In').locator('..');
        btnCount = await signInBtn.count();
        log(`getByText('Sign In').parent: ${btnCount}`);
    }
    if (btnCount === 0) {
        signInBtn = page.locator('text=Sign In');
        btnCount = await signInBtn.count();
        log(`text=Sign In: ${btnCount}`);
    }

    if (btnCount > 0) {
        await signInBtn.click({ force: true });
        log('✓ Clicked Sign In');
    } else {
        // Dump all button-like elements for debugging
        const allButtons = await page.locator('div[role="button"]').all();
        log(`All [role="button"] elements: ${allButtons.length}`);
        for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
            const text = await allButtons[i].innerText();
            log(`  [${i}]: "${text}"`);
        }
        log('❌ Cannot find Sign In button');
        await browser.close();
        process.exit(1);
    }

    // Wait for redirect
    await page.waitForTimeout(5000);
    log(`Post-login URL: ${page.url()}`);

    if (page.url().includes('/login') || page.url().includes('/auth')) {
        log('❌ LOGIN FAILED - still on auth page');
        const body = await page.locator('body').innerText();
        log(`Body: ${body.substring(0, 400)}`);
        await browser.close();
        process.exit(1);
    }
    log('✅ LOGIN SUCCEEDED');

    // ── STEP 4: Navigate to Wallet ──
    log('\n=== STEP 4: NAVIGATE TO WALLET ===');
    // Wait for tab bar to render
    await page.waitForTimeout(2000);
    const walletTab = page.locator('div[role="button"]').filter({ hasText: /Wallet/i }).first();
    try {
        await walletTab.click({ force: true, timeout: 5000 });
        log('✓ Wallet tab clicked');
    } catch {
        await page.goto(`${BASE}/cards`, { waitUntil: 'networkidle', timeout: 15000 });
        log('✓ Navigated to /cards by URL');
    }
    await page.waitForTimeout(3000);
    log(`Wallet URL: ${page.url()}`);

    // ── STEP 5: Verify wallet screen ──
    log('\n=== STEP 5: VERIFY WALLET SCREEN ===');
    const walletText = await page.locator('body').innerText();
    const hasWallet = walletText.includes('Wallet');
    const hasManageCards = walletText.includes('Manage your');
    const hasEmptyState = walletText.includes('No cards yet') || walletText.includes('Add your first');
    const hasCardList = walletText.includes('Active');
    log(`"Wallet" text: ${hasWallet}`);
    log(`"Manage your": ${hasManageCards}`);
    log(`Empty state: ${hasEmptyState}`);
    log(`Card list: ${hasCardList}`);
    log(`Full body excerpt: ${walletText.substring(0, 500)}`);

    // ── STEP 6: Open Add Card sheet ──
    log('\n=== STEP 6: OPEN ADD CARD SHEET ===');
    // Try to find the Add button (either text button or + icon)
    const addBtnCandidates = [
        page.locator('div[role="button"]').filter({ hasText: /Add Card|Add your first/i }).first(),
        page.locator('div[role="button"]').filter({ hasText: 'Add' }).first(),
        page.locator('[class*="addBtn"]').first(),
    ];

    let foundBtn = null;
    for (const btn of addBtnCandidates) {
        const count = await btn.count();
        if (count > 0) {
            foundBtn = btn;
            log(`Found add button via locator`);
            break;
        }
    }

    if (foundBtn) {
        await foundBtn.click({ force: true });
        log('✓ Add button clicked');
    } else {
        log('❌ Could not find any Add button');
    }
    await page.waitForTimeout(2500);

    const sheetText = await page.locator('body').innerText();
    const hasSheet = sheetText.includes('Add New Card') || sheetText.includes('Search') || sheetText.includes('Card Catalog');
    log(`Sheet visible: ${hasSheet}`);
    log(`Body excerpt after click: ${sheetText.substring(0, 500)}`);

    // ── STEP 7: Search SBI Cashback ──
    log('\n=== STEP 7: SEARCH "SBI Cashback" ===');
    const searchInput = page.locator('input').filter({ has: page.locator('[placeholder*="Search"], [placeholder*="search"], [placeholder*="card"]') }).first();
    let searchCount = await searchInput.count();
    if (searchCount === 0) {
        // Any input inside the modal
        searchCount = (await page.locator('input').count());
        log(`Total inputs on page: ${searchCount}`);
    }
    log(`Search input found: ${searchCount > 0}`);

    if (searchCount > 0) {
        const input = searchCount > 0 ? searchInput : page.locator('input').first();
        await input.fill('SBI Cashback');
        await page.waitForTimeout(1200);
        const sbiText = await page.locator('body').innerText();
        log(`SBI/Cashback in results: ${sbiText.includes('SBI') || sbiText.includes('Cashback')}`);
    }

    // ── STEP 8: Search HDFC Millennia ──
    log('\n=== STEP 8: SEARCH "HDFC Millennia" ===');
    if (searchCount > 0) {
        const input = searchCount > 0 ? searchInput : page.locator('input').first();
        await input.fill('HDFC Millennia');
        await page.waitForTimeout(1200);
        const hdfcText = await page.locator('body').innerText();
        log(`HDFC/Millennia in results: ${hdfcText.includes('HDFC') || hdfcText.includes('Millennia')}`);
    }

    // ── STEP 9: Select card from catalog ──
    log('\n=== STEP 9: SELECT & ADD CARD ===');
    // Card catalog items are likely in a scrollable list
    let cardItems = page.locator('[class*="card"], [class*="Card"], [class*="item"], [class*="Item"]').filter({ hasText: /Cashback|Millennia|Rewards|SBI|HDFC/i });
    let itemCount = await cardItems.count();

    if (itemCount === 0) {
        // Try clicking on text directly
        const textEl = page.getByText('SBI', { exact: false }).first();
        itemCount = await textEl.count();
        if (itemCount > 0) {
            await textEl.click({ force: true });
            log('✓ Clicked SBI text');
        } else {
            log('⚠ No card catalog items found');
        }
    } else {
        await cardItems.first().click({ force: true });
        log('✓ Card item clicked');
    }
    await page.waitForTimeout(2000);

    const afterSelect = await page.locator('body').innerText();
    const atConfig = afterSelect.includes('Configure') || afterSelect.includes('Nickname');
    log(`On config screen: ${atConfig}`);
    log(`Config excerpt: ${afterSelect.substring(afterSelect.indexOf('Configure') > -1 ? Math.max(0, afterSelect.indexOf('Configure') - 20) : 0, Math.min(afterSelect.length, 500))}`);

    // ── STEP 10: Save card to wallet ──
    log('\n=== STEP 10: SAVE CARD ===');
    const saveBtn = page.locator('div[role="button"]').filter({ hasText: /Save/i }).first();
    const saveCount = await saveBtn.count();
    log(`Save button found: ${saveCount > 0}`);

    if (saveCount > 0) {
        await saveBtn.click({ force: true });
        log('✓ Save clicked');
        await page.waitForTimeout(4000);
    } else {
        // Try any button on config screen
        const anyBtn = page.locator('div[role="button"]', { hasText: /Save|Add|Confirm/i }).first();
        if (await anyBtn.count() > 0) {
            await anyBtn.click({ force: true });
            log('✓ Fallback button clicked');
            await page.waitForTimeout(4000);
        }
    }

    // ── STEP 11: Verify card in wallet ──
    log('\n=== STEP 11: VERIFY CARD IN WALLET ===');
    await page.waitForTimeout(3000);
    const walletAfter = await page.locator('body').innerText();
    const cardInWallet = walletAfter.includes('Active') || walletAfter.includes('VISA') || walletAfter.includes('Mastercard') || walletAfter.includes('Amex');
    log(`Card in wallet: ${cardInWallet}`);
    log(`Wallet excerpt: ${walletAfter.substring(0, 500)}`);

    // Check card count badge
    const hasBadge = walletAfter.includes('card') && (walletAfter.includes('1 card') || walletAfter.includes('cards'));
    log(`Card count badge visible: ${hasBadge}`);

    // ── STEP 12: Duplicate check ──
    log('\n=== STEP 12: DUPLICATE CHECK ===');
    const activeCount = (walletAfter.match(/Active/g) || []).length;
    const visaCount = (walletAfter.match(/VISA/g) || []).length;
    const mcCount = (walletAfter.match(/Mastercard/g) || []).length;
    log(`"Active" count: ${activeCount}`);
    log(`"VISA" count: ${visaCount}`);
    log(`"Mastercard" count: ${mcCount}`);
    const duplicatesIssue = activeCount > 3 || visaCount > 3 || mcCount > 3;
    log(`Duplicate rendering concern: ${duplicatesIssue ? '⚠ YES' : '✅ No'}`);

    // ── REPORT ──
    log('\n');
    divider();
    log('           FINAL REPORT - WALLET FLOW');
    divider();

    const errors = consoleMsgs.filter(m => m.type === 'error');
    const warnings = consoleMsgs.filter(m => m.type === 'warning');

    log(`\n--- FLOW RESULTS ---`);
    log(`✅ Login: SUCCESS`);
    log(`${hasWallet ? '✅' : '❌'} Wallet screen rendered: ${hasWallet}`);
    log(`${hasEmptyState || hasCardList ? '✅' : '❌'} Content rendered (empty or list): ${hasEmptyState || hasCardList}`);
    log(`${hasSheet ? '✅' : '❌'} Add Card sheet opened: ${hasSheet}`);
    log(`${itemCount > 0 ? '✅' : '⚠'} Card found in catalog: ${itemCount > 0}`);
    log(`${cardInWallet ? '✅' : '❌'} Card added to wallet: ${cardInWallet}`);
    log(`\n--- STABILITY ---`);
    log(`Console errors: ${errors.length}`);
    log(`Console warnings: ${warnings.length}`);
    log(`Network failures: ${failedReqs.length}`);
    log(`Duplicate renders: ${duplicatesIssue ? 'ISSUE' : 'OK'}`);

    if (errors.length) {
        log(`\n--- CONSOLE ERRORS (first 10) ---`);
        errors.slice(0, 10).forEach(e => log(`[ERROR] ${e.text.substring(0, 300)}`));
    }
    if (warnings.length) {
        log(`\n--- CONSOLE WARNINGS (first 10) ---`);
        warnings.slice(0, 10).forEach(w => log(`[WARN] ${w.text.substring(0, 300)}`));
    }
    if (failedReqs.length) {
        log(`\n--- NETWORK FAILURES ---`);
        failedReqs.forEach(f => log(`FAIL ${f.url} — ${f.failure}`));
    }

    log(`\n=== TEST COMPLETE ===`);
    log(`Browser stays open for inspection. Close window to exit.`);
}

run().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});