const { chromium } = require('playwright');

const EMAIL = 'anand@test.com';
const PASSWORD = 'anandagr@123';
const BASE = 'http://localhost:8081';

function log(msg) { console.log(msg); }
function heading(msg) { console.log('\n' + '═'.repeat(60) + '\n' + msg + '\n' + '═'.repeat(60)); }
function sub(msg) { console.log('\n── ' + msg + ' ──'); }

const bugs = [];
const runtimeErrors = [];
const warnings = [];
const networkFails = [];
const uxIssues = [];
const trustIssues = [];
const premiumIssues = [];
const screenshots = [];

function addBug(severity, desc) { bugs.push({ severity, desc }); log(`  🐛 [${severity}] ${desc}`); }
function addRuntime(type, text) { runtimeErrors.push({ type, text }); }
function addWarn(text) { warnings.push(text); }
function addNetwork(url, error) { networkFails.push({ url, error }); }
function addUX(desc) { uxIssues.push(desc); log(`  👤 UX: ${desc}`); }
function addTrust(desc) { trustIssues.push(desc); log(`  ⚡ TRUST: ${desc}`); }
function addPremium(desc) { premiumIssues.push(desc); log(`  💎 PREMIUM: ${desc}`); }

async function run() {
    log('\n🚀 Launching Chromium (headed — keep window visible for inspection)...\n');
    const browser = await chromium.launch({
        headless: false,
        slowMo: 150  // Slightly faster than 200ms for a long test
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // --- Collectors ---
    page.on('console', msg => {
        if (msg.type() === 'error') addRuntime('error', msg.text());
        if (msg.type() === 'warning') addWarn(msg.text());
    });
    page.on('requestfailed', req => addNetwork(req.url(), req.failure()?.errorText));

    // ════════════════════════════════════════════════════════
    // 1. LAUNCH & LOGIN
    // ════════════════════════════════════════════════════════
    heading('1. LAUNCH & LOGIN');

    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

    const bodyText = () => page.locator('body').innerText();
    let text = await bodyText();
    log(`Hydrated: ${text.includes('Sign In')}`);
    log(`Sign In visible: ${text.includes('Sign In')}`);

    if (!text.includes('Sign In')) {
        addBug('CRITICAL', 'Login screen did not hydrate — blank or broken render');
        await browser.close();
        process.exit(1);
    }

    // Fill login
    const inputs = page.locator('input');
    await inputs.first().fill(EMAIL);
    await inputs.last().fill(PASSWORD);
    await page.waitForTimeout(500);

    // Click Sign In
    const signIn = page.getByText('Sign In').locator('..');
    if (await signIn.count() > 0) {
        await signIn.click({ force: true });
    } else {
        addBug('CRITICAL', 'Sign In button not found');
    }
    await page.waitForTimeout(5000);

    const postLoginUrl = page.url();
    log(`Post-login URL: ${postLoginUrl}`);
    if (postLoginUrl.includes('/login') || postLoginUrl.includes('/auth')) {
        addBug('CRITICAL', `Login failed — stuck at ${postLoginUrl}`);
        text = await bodyText();
        log(`Body: ${text.substring(0, 300)}`);
    } else {
        log('✅ Login succeeded');
    }

    // Check for immediate post-login errors
    const immediateErrors = runtimeErrors.length;
    const immediateWarns = warnings.length;
    const immediateNetwork = networkFails.length;
    log(`Runtime errors after login: ${immediateErrors}`);
    log(`Warnings after login: ${immediateWarns}`);
    log(`Network fails after login: ${immediateNetwork}`);

    // ════════════════════════════════════════════════════════
    // 2. HOME / RECOMMENDATION TAB
    // ════════════════════════════════════════════════════════
    heading('2. HOME / RECOMMENDATION TAB');

    // Try clicking "Analyze" or "Home" tab
    let homeTab = page.locator('div[role="button"]').filter({ hasText: /Analyze|Home/i }).first();
    if (await homeTab.count() === 0) {
        homeTab = page.locator('text=Analyze').first();
    }
    if (await homeTab.count() > 0) {
        await homeTab.click({ force: true });
        log('✓ Navigated to Analyze tab');
    } else {
        log('⚠ Navigate to / by URL');
        await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 15000 });
    }
    await page.waitForTimeout(4000);

    text = await bodyText();
    log(`Home excerpt: ${text.substring(0, 400)}`);

    const hasMerchantInput = text.includes('Merchant') || text.includes('merchant') || text.includes('Store');
    const hasAmountInput = text.includes('Amount') || text.includes('amount') || text.includes('₹');
    const hasCardsSection = text.includes('Recommended') || text.includes('Best Card') || text.includes('recommend');
    log(`Merchant input: ${hasMerchantInput}`);
    log(`Amount input: ${hasAmountInput}`);
    log(`Cards section: ${hasCardsSection}`);

    if (!hasMerchantInput && !hasAmountInput) {
        addUX('Recommendation screen may not render properly — no merchant/amount inputs visible');
    }

    // --- Test Recommendation: Amazon ₹299 ---
    sub('Recommendation: Amazon ₹299');
    const allInputs = page.locator('input');
    const inputCount = await allInputs.count();
    log(`Inputs on page: ${inputCount}`);

    // Try finding merchant input (usually first or labeled)
    if (inputCount >= 2) {
        const merchantInput = allInputs.nth(0);
        const amountInput = allInputs.nth(1);

        await merchantInput.fill('Amazon');
        await page.waitForTimeout(800);
        await amountInput.fill('299');
        await page.waitForTimeout(500);

        // Find and click analyze/submit button
        const analyzeBtn = page.locator('text="Analyze Transaction"').first();
        if (await analyzeBtn.count() > 0) {
            await analyzeBtn.click({ force: true });
            log('✓ Clicked Analyze');
            await page.waitForTimeout(4000);

            text = await bodyText();
            log(`After Amazon ₹299: ${text.substring(0, 500)}`);
        } else {
            addUX('No Analyze button found on recommendation screen');
        }
    } else {
        addUX(`Only ${inputCount} inputs on recommendation screen — expected >= 2 for merchant + amount`);
    }

    // --- Test Recommendation: Swiggy ₹1499 ---
    sub('Recommendation: Swiggy ₹1499');
    if (inputCount >= 2) {
        await allInputs.nth(0).fill('Swiggy');
        await page.waitForTimeout(500);
        await allInputs.nth(1).fill('1499');
        await page.waitForTimeout(500);

        const analyzeBtn = page.locator('div[role="button"]').filter({ hasText: /Analyze|Get|Recommend/i }).first();
        if (await analyzeBtn.count() > 0) {
            await analyzeBtn.click({ force: true });
            await page.waitForTimeout(4000);
            text = await bodyText();
            log(`After Swiggy ₹1499: ${text.substring(0, 400)}`);
        }
    }

    // --- Test Recommendation: Uber ₹12500 ---
    sub('Recommendation: Uber ₹12500');
    if (inputCount >= 2) {
        await allInputs.nth(0).fill('Uber');
        await page.waitForTimeout(500);
        await allInputs.nth(1).fill('12500');
        await page.waitForTimeout(500);

        const analyzeBtn = page.locator('div[role="button"]').filter({ hasText: /Analyze|Get|Recommend/i }).first();
        if (await analyzeBtn.count() > 0) {
            await analyzeBtn.click({ force: true });
            await page.waitForTimeout(4000);
            text = await bodyText();
            log(`After Uber ₹12500: ${text.substring(0, 400)}`);
        }
    }

    // --- Test Recommendation: Flipkart ₹15000 ---
    sub('Recommendation: Flipkart ₹15000');
    if (inputCount >= 2) {
        await allInputs.nth(0).fill('Flipkart');
        await page.waitForTimeout(500);
        await allInputs.nth(1).fill('15000');
        await page.waitForTimeout(500);

        const analyzeBtn = page.locator('div[role="button"]').filter({ hasText: /Analyze|Get|Recommend/i }).first();
        if (await analyzeBtn.count() > 0) {
            await analyzeBtn.click({ force: true });
            await page.waitForTimeout(4000);
            text = await bodyText();
            log(`After Flipkart ₹15000: ${text.substring(0, 400)}`);
        }
    }

    // ════════════════════════════════════════════════════════
    // 3. WALLET FLOW
    // ════════════════════════════════════════════════════════
    heading('3. WALLET FLOW');

    let walletTab = page.locator('div[role="button"]').filter({ hasText: /Wallet/i }).first();
    if (await walletTab.count() > 0) {
        await walletTab.click({ force: true });
    } else {
        await page.goto(`${BASE}/cards`, { waitUntil: 'networkidle', timeout: 15000 });
    }
    await page.waitForTimeout(4000);

    text = await bodyText();
    log(`Wallet excerpt: ${text.substring(0, 500)}`);
    const hasAddFirstCard = text.includes('Add Your First');
    const hasCardsList = text.includes('Active') || text.includes('VISA');
    log(`Empty state visible: ${hasAddFirstCard}`);
    log(`Cards list visible: ${hasCardsList}`);

    // Click "Add Your First Card" or the Plus icon
    let addBtn = page.locator('[data-testid="add-card-button"]').first();
    if (await addBtn.count() === 0) {
        addBtn = page.locator('div[role="button"]').filter({ hasText: /Add Your First Card/i }).first();
    }
    
    if (await addBtn.count() > 0) {
        await addBtn.click({ force: true });
        log('✓ Clicked Add Card');
        await page.waitForTimeout(4000);

        text = await bodyText();
        log(`After Add Card: ${text.substring(0, 500)}`);
        const hasSearch = text.includes('Search') || text.includes('search');
        const hasCatalog = text.includes('Catalog') || text.includes('catalog');
        log(`Search visible: ${hasSearch}`);
        log(`Catalog visible: ${hasCatalog}`);

        if (!hasSearch && !hasCatalog) {
            addUX('Add Card sheet may not have opened — no search/catalog visible');
        }

        // Search SBI Cashback
        const searchInput = page.locator('input').first();
        if (await searchInput.count() > 0) {
            await searchInput.fill('SBI Cashback');
            await page.waitForTimeout(2000);
            text = await bodyText();
            log(`After "SBI Cashback" search: ${text.substring(0, 400)}`);

            const hasSBI = text.includes('SBI');
            log(`SBI in results: ${hasSBI}`);

            // Try to click SBI Cashback result
            const sbiResult = page.locator('text="Cashback SBI Card"').first();
            if (await sbiResult.count() > 0) {
                await sbiResult.evaluate(el => el.click());
                await page.waitForTimeout(3000);

                text = await bodyText();
                const atConfig = text.includes('Configure') || text.includes('Nickname') || text.includes('Save');
                log(`Card config visible: ${atConfig}`);
                log(`Config excerpt: ${text.substring(0, 400)}`);

                // Save card
                const saveBtn = page.locator('text="Save to Wallet"').first();
                if (await saveBtn.count() > 0) {
                    await saveBtn.evaluate(el => el.click());
                    log('✓ Saved SBI Cashback');
                    await page.waitForTimeout(4000);
                } else {
                    addUX('No Save button on card config screen');
                }
            } else {
                addUX('SBI Cashback not found in catalog results');
            }
        }

        // Search HDFC Millennia (reopen if needed)
        text = await bodyText();
        if (!text.includes('Search') && !text.includes('Catalog')) {
            // Sheet may have closed — reopen
            const addAgain = page.locator('div[role="button"]').filter({ hasText: /Add/i }).first();
            if (await addAgain.count() > 0) {
                await addAgain.click({ force: true });
                await page.waitForTimeout(3000);
            }
        }

        const searchInput2 = page.locator('input').first();
        if (await searchInput2.count() > 0) {
            await searchInput2.fill('HDFC Millennia');
            await page.waitForTimeout(2000);
            text = await bodyText();
            log(`After "HDFC Millennia" search: ${text.substring(0, 300)}`);

            const hdfcResult = page.locator('text="HDFC Millennia"').first();
            if (await hdfcResult.count() > 0) {
                await hdfcResult.evaluate(el => el.click());
                await page.waitForTimeout(3000);

                const saveBtn = page.locator('text="Save to Wallet"').first();
                if (await saveBtn.count() > 0) {
                    await saveBtn.evaluate(el => el.click());
                    log('✓ Saved HDFC Millennia');
                    await page.waitForTimeout(4000);
                }
            } else {
                addUX('HDFC Millennia not found in catalog results');
            }
        }
    }

    // Verify wallet after adding cards
    text = await bodyText();
    const cardCount = (text.match(/Active/g) || []).length;
    const hasCards = text.includes('Active') || text.includes('VISA') || text.includes('Mastercard');
    log(`Cards in wallet: ${hasCards}`);
    log(`Card entries: ${cardCount}`);

    if (cardCount === 0 && addUX) {
        // already logged nested, skip
    }
    if (cardCount > 4) {
        addBug('MEDIUM', `Possible duplicate card rendering — ${cardCount} "Active" references`);
    }

    // ════════════════════════════════════════════════════════
    // 4. TRANSACTION / HISTORY TAB
    // ════════════════════════════════════════════════════════
    heading('4. TRANSACTION / HISTORY');

    let historyTab = page.locator('div[role="button"]').filter({ hasText: /History|Activity|Transactions/i }).first();
    if (await historyTab.count() > 0) {
        await historyTab.click({ force: true });
    } else {
        await page.goto(`${BASE}/history`, { waitUntil: 'networkidle', timeout: 15000 });
    }
    await page.waitForTimeout(4000);

    text = await bodyText();
    log(`History excerpt: ${text.substring(0, 500)}`);
    const hasTransactions = text.includes('Transaction') || text.includes('Recent') || text.includes('Amount');
    const hasEmptyTransaction = text.includes('No transaction') || text.includes('empty');
    log(`Has transactions: ${hasTransactions}`);
    log(`Empty state: ${hasEmptyTransaction}`);

    // Try Add Transaction button
    const addTransactionBtn = page.locator('div[role="button"]').filter({ hasText: /Add|New Transaction|Record/i }).first();
    if (await addTransactionBtn.count() > 0) {
        await addTransactionBtn.click({ force: true });
        log('✓ Clicked Add Transaction');
        await page.waitForTimeout(4000);

        text = await bodyText();
        log(`Transaction form excerpt: ${text.substring(0, 400)}`);

        // Fill transaction form if visible
        const formInputs = page.locator('input');
        const formInputCount = await formInputs.count();
        log(`Form inputs: ${formInputCount}`);

        if (formInputCount >= 2) {
            // Try filling merchant and amount
            await formInputs.nth(0).fill('Amazon');
            await formInputs.nth(1).fill('500');
            await page.waitForTimeout(500);

            // Find save/submit
            const submitBtn = page.locator('div[role="button"]').filter({ hasText: /Save|Submit|Add/i }).first();
            if (await submitBtn.count() > 0) {
                await submitBtn.click({ force: true });
                log('✓ Submitted transaction');
                await page.waitForTimeout(4000);

                text = await bodyText();
                log(`After transaction: ${text.substring(0, 500)}`);
                const hasNewTransaction = text.includes('Amazon') || text.includes('500');
                if (!hasNewTransaction) {
                    addUX('Transaction submitted but not reflecting in list');
                }
            }
        }

        // Look for transaction detail (click on a transaction item)
        const txItem = page.locator('div').filter({ hasText: /Amazon|Swiggy|Uber|Flipkart/i }).first();
        if (await txItem.count() > 0) {
            await txItem.click({ force: true });
            await page.waitForTimeout(3000);

            text = await bodyText();
            log(`Transaction detail: ${text.substring(0, 500)}`);
            const hasInsight = text.includes('Insight') || text.includes('insight') || text.includes('Better') || text.includes('Reward');
            log(`Insight visible: ${hasInsight}`);
            if (!hasInsight) {
                addUX('Transaction detail opened but no insight/reward recommendation visible');
            }
        }
    } else {
        addUX('No Add Transaction button on history screen');
    }

    // ════════════════════════════════════════════════════════
    // 5. INSIGHTS / ANALYZE TAB
    // ════════════════════════════════════════════════════════
    heading('5. INSIGHTS / ANALYZE');

    let insightsTab = page.locator('div[role="button"]').filter({ hasText: /Insights|Analyze|Analysis/i }).first();
    if (await insightsTab.count() > 0) {
        await insightsTab.click({ force: true });
        await page.waitForTimeout(4000);

        text = await bodyText();
        log(`Insights excerpt: ${text.substring(0, 500)}`);
        const hasSummary = text.includes('Summary') || text.includes('Total') || text.includes('Spend');
        const hasFeeWaiver = text.includes('Fee') || text.includes('Waiver') || text.includes('Annual');
        log(`Summary cards: ${hasSummary}`);
        log(`Fee waiver intel: ${hasFeeWaiver}`);
    } else {
        log('⚠ No dedicated Insights tab found — may be integrated into Home');
    }

    // ════════════════════════════════════════════════════════
    // 6. PROFILE / SETTINGS
    // ════════════════════════════════════════════════════════
    heading('6. PROFILE / SETTINGS');

    let profileTab = page.locator('div[role="button"]').filter({ hasText: /Profile|Settings/i }).first();
    if (await profileTab.count() > 0) {
        await profileTab.click({ force: true });
        await page.waitForTimeout(4000);

        text = await bodyText();
        log(`Profile excerpt: ${text.substring(0, 500)}`);
        const hasEmail = text.includes('anand@test.com') || text.includes('@');

        // Check for clickable items
        const allBtns = await page.locator('div[role="button"]').all();
        log(`Profile buttons: ${allBtns.length}`);
        for (let i = 0; i < allBtns.length; i++) {
            const btnText = await allBtns[i].innerText();
            log(`  [${i}]: "${btnText.substring(0, 50)}"`);
        }

        // Try clicking settings items
        const preferencesBtn = page.locator('div[role="button"]').filter({ hasText: /Preferences/i }).first();
        if (await preferencesBtn.count() > 0) {
            await preferencesBtn.click({ force: true });
            await page.waitForTimeout(2500);
            text = await bodyText();
            log(`Preferences: ${text.substring(0, 300)}`);
            // Go back
            await page.goBack().catch(() => { });
            await page.waitForTimeout(1000);
        }

        const securityBtn = page.locator('div[role="button"]').filter({ hasText: /Security/i }).first();
        if (await securityBtn.count() > 0) {
            await securityBtn.click({ force: true });
            await page.waitForTimeout(2500);
            text = await bodyText();
            log(`Security: ${text.substring(0, 300)}`);
            await page.goBack().catch(() => { });
            await page.waitForTimeout(1000);
        }

        const notificationsBtn = page.locator('div[role="button"]').filter({ hasText: /Notification/i }).first();
        if (await notificationsBtn.count() > 0) {
            await notificationsBtn.click({ force: true });
            await page.waitForTimeout(2500);
            text = await bodyText();
            log(`Notifications: ${text.substring(0, 300)}`);
            await page.goBack().catch(() => { });
            await page.waitForTimeout(1000);
        }

        // Logout
        const logoutBtn = page.locator('div[role="button"]').filter({ hasText: /Logout|Sign Out|Log Out/i }).first();
        if (await logoutBtn.count() > 0) {
            log('Logout button found');
            // Don't actually click — just verify it exists
        } else {
            addUX('No logout button on profile screen');
        }
    } else {
        addUX('No Profile tab in navigation');
    }

    // ════════════════════════════════════════════════════════
    // 7. NAVIGATION STRESS TEST
    // ════════════════════════════════════════════════════════
    heading('7. NAVIGATION STRESS TEST');

    const tabs = page.locator('div[role="button"]').filter({ hasText: /Wallet|Analyze|History|Profile|Home/i });
    const tabCount = await tabs.count();
    const tabTexts = [];
    for (let i = 0; i < tabCount; i++) {
        tabTexts.push(await tabs.nth(i).innerText());
    }
    log(`Tab bar items: ${tabTexts.join(', ')}`);

    for (let round = 0; round < 3; round++) {
        for (const tabText of tabTexts) {
            const tab = page.locator('div[role="button"]').filter({ hasText: tabText }).first();
            if (await tab.count() > 0) {
                await tab.click({ force: true });
                await page.waitForTimeout(1000);
            }
        }
        log(`Round ${round + 1} complete`);
    }

    text = await bodyText();
    log(`After stress test body: ${text.substring(0, 200)}`);
    log(`Still responsive: ${text.length > 50}`);

    const newErrors = runtimeErrors.length - immediateErrors;
    log(`New errors during stress test: ${newErrors}`);

    if (newErrors > 0) {
        addBug('MEDIUM', `Navigation stress test caused ${newErrors} new runtime errors`);
    }

    // Count duplicate/unmounted warnings
    const duplicateWarnings = warnings.filter(w => w.includes('unique key') || w.includes('key prop')).length;
    if (duplicateWarnings > 0) {
        addBug('LOW', `${duplicateWarnings} React key warnings — possible list rendering issue`);
    }

    // ════════════════════════════════════════════════════════
    // FINAL REPORT
    // ════════════════════════════════════════════════════════
    heading('FINAL PRODUCT QA REPORT');

    // Deduplicate runtime errors
    const uniqueErrors = [...new Set(runtimeErrors.map(e => e.text))];

    log('\n──────────────────────────────────────────');
    log('1. CRITICAL BUGS');
    bugs.filter(b => b.severity === 'CRITICAL').forEach(b => log(`🔴 ${b.desc}`));
    if (!bugs.filter(b => b.severity === 'CRITICAL').length) log('  None found in this session');

    log('\n2. BROKEN FLOWS');
    bugs.filter(b => b.severity === 'HIGH' || b.severity === 'MEDIUM').forEach(b => log(`⚠️ ${b.desc}`));
    if (!bugs.some(b => b.severity === 'HIGH' || b.severity === 'MEDIUM')) log('  None found in this session');

    log('\n3. RUNTIME ERRORS');
    log(`  Total: ${runtimeErrors.length}`);
    log(`  Unique: ${uniqueErrors.length}`);
    uniqueErrors.slice(0, 15).forEach(e => log(`  🔴 ${e.substring(0, 300)}`));

    log('\n4. NETWORK / API PROBLEMS');
    log(`  Failed requests: ${networkFails.length}`);
    networkFails.slice(0, 10).forEach(f => log(`  ❌ ${f.url.substring(0, 120)} — ${f.error}`));

    log('\n5. UX PROBLEMS');
    uxIssues.forEach(i => log(`  👤 ${i}`));
    if (!uxIssues.length) log('  None identified');

    log('\n6. TRUST-BREAKING ISSUES');
    trustIssues.forEach(i => log(`  ⚡ ${i}`));
    if (!trustIssues.length) log('  None identified');

    log('\n7. PREMIUM FEEL PROBLEMS');
    premiumIssues.forEach(i => log(`  💎 ${i}`));
    if (!premiumIssues.length) log('  None identified');

    log('\n8. CONSOLE WARNINGS');
    log(`  Total warnings: ${warnings.length}`);
    const uniqueWarns = [...new Set(warnings)];
    uniqueWarns.slice(0, 15).forEach(w => log(`  ⚠️ ${w.substring(0, 300)}`));

    log('\n9. HIGHEST ROI IMPROVEMENTS');
    let rois = [];
    if (networkFails.length > 0) rois.push('1. Fix CORS on backend (blocks all API calls from web)');
    if (uniqueErrors.some(e => e.includes('ExpoSecureStore') || e.includes('getValueWithKeyAsync'))) rois.push('2. Add web-compatible token storage (5+ errors per cycle)');
    if (warnings.some(w => w.includes('shadow'))) rois.push('3. Migrate shadow props to boxShadow (deprecation)');
    if (warnings.some(w => w.includes('register'))) rois.push('4. Fix/delete dead register.tsx route');
    if (uxIssues.some(i => i.includes('button'))) rois.push('5. Ensure all CTAs are discoverable and functional');
    rois.push('6. Add error boundaries with user-facing fallbacks');
    rois.push('7. Add loading skeletons for ALL async states');
    rois.forEach(r => log(`  ${r}`));

    log('\n10. LAUNCH BLOCKERS');
    const blockers = [];
    if (networkFails.length > 3) blockers.push('CORS blocks all API access on web');
    if (uniqueErrors.length > 5) blockers.push(`${uniqueErrors.length} unique runtime errors — too many for production`);
    if (warnings.length > 10) blockers.push(`${warnings.length} console warnings — clean for production`);
    if (bugs.filter(b => b.severity === 'CRITICAL').length) blockers.push('Critical bugs present');
    blockers.forEach(b => log(`  🚫 ${b}`));
    if (!blockers.length) log('  ✅ No launch blockers detected');

    const errorScore = Math.max(0, 10 - Math.min(10, Math.floor(uniqueErrors.length / 2)));
    const warningScore = Math.max(0, 10 - Math.min(10, Math.floor(warnings.length / 3)));
    const networkScore = Math.max(0, 10 - Math.min(10, networkFails.length));
    const bugScore = Math.max(0, 10 - bugs.filter(b => b.severity === 'CRITICAL').length * 3 - bugs.filter(b => b.severity === 'HIGH').length * 2 - bugs.filter(b => b.severity === 'MEDIUM').length);
    const uxScore = Math.max(0, 10 - uxIssues.length);
    const trustScore = Math.max(0, 10 - trustIssues.length * 2);
    const overall = Math.round((errorScore + warningScore + networkScore + bugScore + uxScore + trustScore) / 6);

    log(`\n11. SCORES`);
    log(`  Runtime stability: ${errorScore}/10`);
    log(`  Code quality (warnings): ${warningScore}/10`);
    log(`  Network/API health: ${networkScore}/10`);
    log(`  Bug severity score: ${bugScore}/10`);
    log(`  UX quality: ${uxScore}/10`);
    log(`  Trust factor: ${trustScore}/10`);
    log(`  ────────────────────`);
    log(`  OVERALL: ${overall}/10`);

    log(`\n12. LAUNCH READINESS VERDICT`);
    if (overall >= 8 && !blockers.length) {
        log('  ✅ READY for launch');
    } else if (overall >= 6) {
        log('  ⚠️ CONDITIONALLY READY — fix launch blockers first');
    } else if (overall >= 4) {
        log('  🔴 NOT READY — significant work needed');
    } else {
        log('  🚫 CRITICAL FAILURE — do not launch');
    }

    log(`\n`);
    log('═'.repeat(60));
    log('  QA PASS COMPLETE');
    log('  Browser stays open for manual inspection');
    log('  Close the browser window when done');
    log('═'.repeat(60));
}

run().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});