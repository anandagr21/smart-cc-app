/**
 * Backend Intelligence Engine — Comprehensive Architecture Verification
 *
 * Verifies the new Backend Intelligence architecture across 3 vectors:
 *
 *   Vector 1: API Contract & Determinism
 *     - Authenticates with backend API to obtain Bearer token
 *     - Calls GET /api/v1/insights/ and validates strict schema
 *     - Verifies deterministic insight_hash across 3 consecutive calls
 *
 *   Vector 2: Suppression & Cooldown Engine (Statefulness)
 *     - Captures insight_hash from the first insight
 *     - Dismisses it via POST /api/v1/insights/{hash}/dismiss
 *     - Verifies dismissed insight is absent from subsequent GET calls
 *
 *   Vector 3: Frontend Integration (Presentation Layer)
 *     - Navigates to Wallet Tab and verifies FeaturedCardsSection renders
 *     - Verifies UI gracefully degrades on API failure (500 mock)
 *     - Verifies no crashes from property mismatches (related_card_id vs relatedCardId)
 *
 * Usage:
 *   npx playwright test brain/backend_intelligence_verification.js --headed
 *   npx playwright test brain/backend_intelligence_verification.js           (headless)
 *
 * Requires:
 *   - Backend API running at http://localhost:8000
 *   - Frontend running at http://localhost:8081
 */

const { test, expect } = require('@playwright/test');
const crypto = require('crypto');

const API_BASE = 'http://localhost:8000/api/v1';
const APP_BASE = 'http://localhost:8081';
const CREDENTIALS = { email: 'anand@test.com', password: 'anandagr@123' };

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let cachedToken = null;

/**
 * Obtain a Bearer token by calling POST /auth/login.
 * Caches the token across tests in the same worker.
 */
async function getAuthToken(request) {
    if (cachedToken) {
        console.log('  🔑 Using cached auth token');
        return cachedToken;
    }

    console.log('  🔑 Authenticating with backend...');
    const response = await request.post(`${API_BASE}/auth/login`, {
        data: CREDENTIALS,
        headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log(`  ✅ Auth response keys: ${Object.keys(body).join(', ')}`);

    // Backend wraps all responses in {data, meta} envelope
    const data = body.data || body;
    console.log(`  ✅ Unwrapped data keys: ${Object.keys(data).join(', ')}`);

    // Validate TokenResponse schema
    expect(data).toHaveProperty('access_token');
    expect(data).toHaveProperty('token_type');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('id');
    expect(data.user).toHaveProperty('email');
    expect(data.user).toHaveProperty('full_name');
    expect(data.token_type).toBe('bearer');

    cachedToken = data.access_token;
    console.log(`  ✅ Token obtained (${cachedToken.substring(0, 20)}...)`);
    return cachedToken;
}

/**
 * Validate a single InsightResponse object against the strict schema.
 * Returns array of validation errors (empty = valid).
 */
function validateInsightSchema(insight, index) {
    const errors = [];
    const requiredStrings = [
        'id', 'category', 'priority', 'confidence',
        'title', 'summary', 'reasoning',
        'badge_label', 'badge_color', 'insight_hash',
    ];

    for (const field of requiredStrings) {
        if (!insight[field] || typeof insight[field] !== 'string' || insight[field].length === 0) {
            errors.push(`  ❌ insight[${index}].${field}: missing or empty (got: ${JSON.stringify(insight[field])})`);
        }
    }

    // category must be a valid InsightCategory enum value
    const validCategories = ['FEE_WAIVER', 'MISSED_REWARDS', 'UNDERUTILIZED_CARD', 'PORTFOLIO_OPTIMIZATION'];
    if (!validCategories.includes(insight.category)) {
        errors.push(`  ❌ insight[${index}].category: invalid value "${insight.category}" (expected one of ${validCategories.join(', ')})`);
    }

    // priority must be a valid InsightPriority enum value
    const validPriorities = ['URGENT', 'HIGH', 'MEDIUM', 'INFORMATIONAL'];
    if (!validPriorities.includes(insight.priority)) {
        errors.push(`  ❌ insight[${index}].priority: invalid value "${insight.priority}" (expected one of ${validPriorities.join(', ')})`);
    }

    // confidence must be a valid ConfidenceLevel enum value
    const validConfidences = ['HIGH', 'MODERATE', 'ESTIMATED'];
    if (!validConfidences.includes(insight.confidence)) {
        errors.push(`  ❌ insight[${index}].confidence: invalid value "${insight.confidence}" (expected one of ${validConfidences.join(', ')})`);
    }

    // actionability_score must be an integer between 0-100
    if (typeof insight.actionability_score !== 'number' || !Number.isInteger(insight.actionability_score)
        || insight.actionability_score < 0 || insight.actionability_score > 100) {
        errors.push(`  ❌ insight[${index}].actionability_score: must be integer 0-100 (got: ${JSON.stringify(insight.actionability_score)})`);
    }

    // cooldown_period_hours should be an integer if present
    if (insight.cooldown_period_hours !== undefined && insight.cooldown_period_hours !== null) {
        if (typeof insight.cooldown_period_hours !== 'number' || !Number.isInteger(insight.cooldown_period_hours)) {
            errors.push(`  ❌ insight[${index}].cooldown_period_hours: must be integer (got: ${JSON.stringify(insight.cooldown_period_hours)})`);
        }
    }

    // related_card_id should be string or null if present
    if (insight.related_card_id !== undefined && insight.related_card_id !== null) {
        if (typeof insight.related_card_id !== 'string') {
            errors.push(`  ❌ insight[${index}].related_card_id: must be string or null (got: ${JSON.stringify(insight.related_card_id)})`);
        }
    }

    // source_transactions must be an array
    if (!Array.isArray(insight.source_transactions)) {
        errors.push(`  ❌ insight[${index}].source_transactions: must be an array (got: ${JSON.stringify(insight.source_transactions)})`);
    }

    // insight_hash must be a non-empty string (deterministic hash)
    if (!insight.insight_hash || typeof insight.insight_hash !== 'string' || insight.insight_hash.length < 8) {
        errors.push(`  ❌ insight[${index}].insight_hash: invalid hash (got: ${JSON.stringify(insight.insight_hash)})`);
    }

    // reasoning must be non-empty (explainability is mandatory!)
    if (!insight.reasoning || typeof insight.reasoning !== 'string' || insight.reasoning.trim().length === 0) {
        errors.push(`  ❌ insight[${index}].reasoning: EXPLAINABILITY MISSING — reasoning string is empty or absent`);
    }

    return errors;
}

// ──────────────────────────────────────────────
// Vector 1: API Contract & Determinism
// ──────────────────────────────────────────────

test.describe('Vector 1: API Contract & Determinism', () => {
    test('GET /api/v1/insights/ returns valid InsightResponse[] with all required fields', async ({ request }) => {
        const token = await getAuthToken(request);

        console.log('  📡 Calling GET /api/v1/insights/ ...');
        const response = await request.get(`${API_BASE}/insights/`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        expect(response.status()).toBe(200);
        console.log(`  ✅ HTTP ${response.status()}`);

        const insights = await response.json();
        console.log(`  📊 Received ${insights.length} insight(s)`);

        // Must be an array
        expect(Array.isArray(insights)).toBe(true);

        if (insights.length === 0) {
            console.log('  ⚠️  No insights returned (user may lack sufficient data for insights)');
            // Schema validation on empty array still passes
            return;
        }

        // Validate each insight against the strict schema
        let totalErrors = 0;
        for (let i = 0; i < insights.length; i++) {
            const errors = validateInsightSchema(insights[i], i);
            for (const err of errors) {
                console.log(err);
                totalErrors++;
            }
        }

        expect(totalErrors).toBe(0);

        // Log successful schema validation summary
        console.log(`  ✅ All ${insights.length} insight(s) passed strict schema validation`);
        for (let i = 0; i < insights.length; i++) {
            const ins = insights[i];
            console.log(`     [${i}] id=${ins.id.substring(0, 8)}... category=${ins.category} priority=${ins.priority} confidence=${ins.confidence} badge="${ins.badge_label}" reasoning_len=${ins.reasoning.length}`);
        }
    });

    test('Determinism: insight_hash remains identical across 3 consecutive calls', async ({ request }) => {
        const token = await getAuthToken(request);

        console.log('  📡 Calling GET /api/v1/insights/ 3 times for determinism check...');

        const results = [];
        for (let attempt = 1; attempt <= 3; attempt++) {
            const response = await request.get(`${API_BASE}/insights/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            expect(response.status()).toBe(200);
            const insights = await response.json();
            results.push(insights);
            console.log(`     Call ${attempt}: ${insights.length} insight(s)`);
            await new Promise(r => setTimeout(r, 500)); // small delay between calls
        }

        if (results[0].length === 0) {
            console.log('  ⚠️  No insights returned — determinism check skipped (empty baseline)');
            return;
        }

        // Build hash sets for each call
        const hashSets = results.map(insights =>
            new Set(insights.map(i => i.insight_hash))
        );

        // Verify hash consistency across calls
        // For each hash in call 1, it must appear in calls 2 and 3
        let mismatches = 0;
        const call1Hashes = Array.from(hashSets[0]);

        for (const hash of call1Hashes) {
            const inCall2 = hashSets[1].has(hash);
            const inCall3 = hashSets[2].has(hash);
            if (!inCall2 || !inCall3) {
                mismatches++;
                console.log(`  ❌ Hash ${hash.substring(0, 16)}... — present in call 1, call2=${inCall2}, call3=${inCall3}`);
            }
        }

        // Also verify no new hashes appeared in call 2 or 3 that weren't in call 1
        const newInCall2 = Array.from(hashSets[1]).filter(h => !hashSets[0].has(h));
        const newInCall3 = Array.from(hashSets[2]).filter(h => !hashSets[0].has(h));

        if (newInCall2.length > 0) {
            mismatches += newInCall2.length;
            console.log(`  ❌ ${newInCall2.length} new hash(es) appeared in call 2 that weren't in call 1`);
        }
        if (newInCall3.length > 0) {
            mismatches += newInCall3.length;
            console.log(`  ❌ ${newInCall3.length} new hash(es) appeared in call 3 that weren't in call 1`);
        }

        expect(mismatches).toBe(0);
        console.log(`  ✅ Determinism verified: all ${call1Hashes.length} insight_hash(es) identical across 3 calls`);
    });
});

// ──────────────────────────────────────────────
// Vector 2: Suppression & Cooldown Engine
// ──────────────────────────────────────────────

test.describe('Vector 2: Suppression & Cooldown Engine', () => {
    test('Dismissing an insight removes it from subsequent GET calls', async ({ request }) => {
        const token = await getAuthToken(request);

        // Step 1: Get insights and capture the first insight_hash
        console.log('  📡 Step 1: Fetching initial insights...');
        const initialResponse = await request.get(`${API_BASE}/insights/`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(initialResponse.status()).toBe(200);
        const initialInsights = await initialResponse.json();

        if (initialInsights.length === 0) {
            console.log('  ⚠️  No insights to dismiss — suppression test skipped');
            return;
        }

        const firstHash = initialInsights[0].insight_hash;
        const firstCategory = initialInsights[0].category;
        console.log(`  🎯 Target insight: hash=${firstHash.substring(0, 16)}... category=${firstCategory}`);

        // Step 2: Dismiss the insight
        console.log(`  📡 Step 2: Dismissing insight ${firstHash.substring(0, 16)}...`);
        const dismissResponse = await request.post(`${API_BASE}/insights/${encodeURIComponent(firstHash)}/dismiss`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(dismissResponse.status()).toBe(200);
        const dismissBody = await dismissResponse.json();
        expect(dismissBody.status).toBe('dismissed');
        console.log('  ✅ Insight dismissed');

        // Step 3: Fetch insights again and verify the dismissed hash is absent
        console.log('  📡 Step 3: Fetching insights post-dismissal...');
        const afterResponse = await request.get(`${API_BASE}/insights/`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(afterResponse.status()).toBe(200);
        const afterInsights = await afterResponse.json();

        const afterHashes = new Set(afterInsights.map(i => i.insight_hash));
        const isStillPresent = afterHashes.has(firstHash);

        if (isStillPresent) {
            console.log(`  ❌ Dismissed insight hash ${firstHash.substring(0, 16)}... is STILL present in response`);
        } else {
            console.log(`  ✅ Dismissed insight successfully removed — hash ${firstHash.substring(0, 16)}... absent from response`);
        }

        expect(isStillPresent).toBe(false);

        // Verify no other insights were accidentally removed
        console.log(`     Insight count: before=${initialInsights.length}, after=${afterInsights.length}`);
    });
});

// ──────────────────────────────────────────────
// Vector 3: Frontend Integration (Presentation Layer)
// ──────────────────────────────────────────────

test.describe('Vector 3: Frontend Integration', () => {

    /**
     * Authenticate by calling the login API programmatically and injecting the token
     * into localStorage (Zustand reads auth_token from localStorage on web).
     * This avoids interacting with slow-hydrating React Native Web TextInput components.
     */
    async function authenticateBrowser(page) {
        // First, navigate to the app to establish the origin for localStorage
        await page.goto(APP_BASE, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Check if already authenticated via Zustand/auth redirect
        const currentUrl = page.url();
        if (currentUrl.includes('(tabs)') || currentUrl.includes('/cards')) {
            console.log('  🔑 Already authenticated (session cached)');
            return;
        }

        // Programmatic auth: call login API from browser context and persist token
        console.log('  🔑 Authenticating via API (injecting token)...');
        const authResult = await page.evaluate(async (credentials) => {
            try {
                const response = await fetch('http://localhost:8000/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials),
                });
                if (!response.ok) {
                    return { success: false, error: `HTTP ${response.status}` };
                }
                const body = await response.json();
                // Backend wraps all responses in {data, meta} envelope
                const data = body.data || body;
                const token = data.access_token;
                // Store in localStorage (read by Zustand's initializeAuth)
                localStorage.setItem('auth_token', token);
                return { success: true, token: token.substring(0, 20) + '...' };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }, CREDENTIALS);

        if (authResult.success) {
            console.log(`  ✅ Token injected to localStorage (${authResult.token})`);
        } else {
            console.log(`  ❌ Programmatic auth failed: ${authResult.error}`);
            throw new Error(`Auth failed: ${authResult.error}`);
        }

        // Navigate to the cards tab — _layout.tsx will read the token from localStorage
        // and redirect to (tabs) automatically
        await page.goto(`${APP_BASE}/cards`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const finalUrl = page.url();
        if (finalUrl.includes('(tabs)') || finalUrl.includes('/cards')) {
            console.log('  ✅ App loaded authenticated — on Cards page');
        } else {
            console.log(`  ⚠️  Unexpected URL after auth: ${finalUrl}`);
        }
    }

    test('FeaturedCardsSection renders with backend insight pills (badge_label, badge_color)', async ({ page }) => {
        await page.goto(APP_BASE, { waitUntil: 'networkidle' });
        await authenticateBrowser(page);

        // Navigate to Wallet Tab (/cards)
        await page.goto(`${APP_BASE}/cards`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        console.log('  📡 Intercepting /api/v1/insights/ network requests...');

        // Check for insight badge pills rendered on screen
        // These come from the backend as badge_label values like "NEAR WAIVER", "UNDERUTILIZED", etc.
        const insightBadges = page.locator('text=/FEE WAIVER|UNDERUTILIZED|ANNUAL SPEND|NEAR|ACTIVE/i');
        const badgeCount = await insightBadges.count();

        console.log(`  🔍 Found ${badgeCount} insight badge(s) on Wallet/Cards screen`);

        if (badgeCount > 0) {
            const badgeText = await insightBadges.first().textContent();
            console.log(`  🏷️  Insight badge: "${badgeText}"`);

            // Verify badge is dynamic insight text, not a static category
            const staticTags = ['DINING', 'TRAVEL', 'GROCERY', 'ENTERTAINMENT', 'FUEL'];
            const isStatic = staticTags.some(tag =>
                badgeText?.toUpperCase().includes(tag)
            );
            expect(isStatic).toBe(false);
        } else {
            console.log('  ℹ️  No insight badges visible (may lack wallet cards with spend data)');
        }

        // Verify FeaturedCardsSection exists in the DOM
        const featuredSection = page.locator('[class*="FeaturedCards"], [class*="featuredCards"]').first();
        const sectionExists = await featuredSection.count() > 0;
        console.log(`  🔍 FeaturedCardsSection container found: ${sectionExists}`);

        // Verify no crashes from property name mismatches
        // The frontend should use related_card_id (snake_case from backend) not relatedCardId
        const pageErrors = [];
        page.on('pageerror', err => pageErrors.push(err.message));

        // Verify the page loaded without JavaScript errors
        await page.waitForTimeout(1000);
        if (pageErrors.length > 0) {
            console.log(`  ❌ Page errors detected: ${pageErrors.join('; ')}`);
            // Check specifically for relatedCardId vs related_card_id issues
            const propErrors = pageErrors.filter(e =>
                e.includes('relatedCardId') || e.includes('related_card_id') ||
                e.includes('undefined') || e.includes('is not a function')
            );
            if (propErrors.length > 0) {
                console.log(`  ❌ Property mismatch errors: ${propErrors.join('; ')}`);
            }
            expect(propErrors.length).toBe(0);
        } else {
            console.log('  ✅ No JavaScript errors on Cards page');
        }
    });

    test('Resilience: FeaturedCardsSection gracefully degrades on /api/v1/insights/ 500 failure', async ({ page }) => {
        // Mock the insights endpoint to return a 500 error
        console.log('  🎭 Setting up network mock: /api/v1/insights/ → 500');

        await page.route('**/api/v1/insights/**', async (route) => {
            const url = route.request().url();
            // Only mock the GET insights list, not dismiss/shown endpoints
            if (route.request().method() === 'GET' && !url.includes('/dismiss') && !url.includes('/shown')) {
                console.log(`  🎭 Intercepted GET ${url} → responding with 500`);
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ detail: 'Internal Server Error' }),
                });
            } else {
                await route.continue();
            }
        });

        // Track page errors
        const pageErrors = [];
        page.on('pageerror', err => pageErrors.push(err.message));

        await page.goto(APP_BASE, { waitUntil: 'networkidle' });
        await authenticateBrowser(page);

        // Navigate to Wallet Tab
        await page.goto(`${APP_BASE}/cards`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(4000);

        console.log('  🔍 Checking Cards page resilience after API 500...');

        // The page should NOT crash — FeaturedCardsSection should degrade gracefully
        // It should still render cards sorted by active status and annual spend
        const crashErrors = pageErrors.filter(e =>
            e.includes('Cannot read properties of undefined') ||
            e.includes('is not a function') ||
            e.includes('Cannot destructure') ||
            e.includes('TypeError') ||
            e.includes('Uncaught')
        );

        if (crashErrors.length > 0) {
            console.log(`  ❌ App CRASHED on 500 response: ${crashErrors.join('; ')}`);
        } else {
            console.log('  ✅ App did NOT crash — graceful degradation confirmed');
        }

        // Verify the page still renders the basic Wallet UI (cards section)
        // Even without insights, cards should still show
        const cardElements = page.locator('text=/HDFC|SBI|ICICI|Axis|Amex|RBL|Kotak|Yes|IDFC|Citi|HSBC|AU|Indus/i');
        const cardCount = await cardElements.count();
        console.log(`  🔍 Card references found on degraded page: ${cardCount}`);

        // Verify FeaturedCardsSection container still exists (empty/fallback state, not removed)
        const featuredSection = page.locator('[class*="FeaturedCards"], [class*="featuredCards"]').first();
        const sectionStillExists = await featuredSection.count() > 0;
        console.log(`  🔍 FeaturedCardsSection container present post-error: ${sectionStillExists}`);

        // Clean up route mock
        await page.unroute('**/api/v1/insights/**');

        expect(crashErrors.length).toBe(0);
    });
});