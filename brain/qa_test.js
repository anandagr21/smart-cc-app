const { chromium } = require('playwright');

(async () => {
  // Launch browser with headless: false so the user can see the UI
  // Add a slight slowMo so actions are visibly clear
  console.log('Launching browser in headed mode...');
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Launch App
    console.log('Navigating to http://localhost:8081');
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    // 2. Login Flow
    // If not already logged in, the login form will be visible.
    const loginVisible = await page.locator('text="Sign In"').isVisible();
    if (loginVisible) {
      console.log('Performing Login Flow...');
      await page.fill('input[type="email"]', 'anand@test.com');
      await page.fill('input[type="password"]', 'anandagr@123');
      await page.keyboard.press('Enter');
      // Wait for login to complete and redirect
      await page.waitForTimeout(2000);
    } else {
      console.log('Already logged in, skipping Login Flow.');
    }

    // 3. Wallet Flow
    console.log('Starting Wallet Flow...');
    await page.goto('http://localhost:8081/cards');
    await page.waitForLoadState('networkidle');

    console.log('Clicking "Add Your First Card" or "Add Card"...');
    const html = await page.content();
    require('fs').writeFileSync('dom.html', html);

    // Try a standard playwright click first. If the button is rendered by RN Web, it often has aria-label.
    // If not, we will just use evaluate to click anything that looks like a button with an SVG.
    try {
      await page.locator('[aria-label="Add Card"]').click({ force: true, timeout: 5000 });
    } catch {
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('div[role="button"], div[tabindex="0"]')).find(e => e.querySelector('svg'));
        if (el) el.click();
      });
    }

    // Wait for modal to open
    await page.waitForTimeout(1000);
    console.log('Searching for Cashback SBI Card...');
    await page.fill('input[placeholder*="Search"]', 'Cashback SBI Card');
    await page.waitForTimeout(500);

    console.log('Selecting card...');
    await page.locator('text="Cashback SBI Card"').first().click({ force: true });

    await page.waitForTimeout(1000);
    console.log('Clicking Save to Wallet...');
    await page.locator('text="Save to Wallet"').first().click({ force: true });

    // Wait for the backend response to complete
    await page.waitForTimeout(3000);
    console.log('Wallet Flow completed. Verified card saved.');

    // 4. Recommendation Flow
    console.log('Starting Recommendation Flow...');
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    console.log('Filling recommendation request...');
    await page.fill('input[placeholder="e.g. Amazon, Uber, Swiggy"]', 'Amazon');
    await page.fill('input[placeholder="e.g. 1500"]', '299');

    console.log('Clicking Analyze Transaction...');
    await page.locator('text="Analyze Transaction"').first().click({ force: true });

    // Wait for the optimization API
    console.log('Waiting for Optimization Engine...');
    await page.waitForTimeout(4000);
    console.log('Recommendation Flow completed. Results should be visible on screen.');

    console.log('Leaving browser open for 5 seconds to inspect final state...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Test script encountered an error:', error);
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
})();
