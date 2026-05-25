const { chromium } = require('playwright');

async function testAddTransaction() {
  console.log('Launching browser in headed mode...');
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/transactions') && response.status() === 422) {
        console.log('422 Response Error:', await response.text());
      }
    });

    // 1. Login
    console.log('Navigating to login...');
    await page.goto('http://localhost:8081/login', { waitUntil: 'networkidle' });
    
    await page.locator('input').nth(0).fill('anand@test.com');
    await page.locator('input').nth(1).fill('anandagr@123');
    await page.locator('text="Sign In"').locator('..').click({ force: true });
    
    await page.waitForTimeout(3000);
    console.log('Login successful. Current URL:', page.url());

    // 2. Go to History tab
    console.log('Navigating to History tab...');
    const historyTab = page.locator('div[role="button"]').filter({ hasText: /History|Activity|Transactions/i }).first();
    if (await historyTab.count() > 0) {
      await historyTab.click({ force: true });
    } else {
      await page.goto('http://localhost:8081/history');
    }
    await page.waitForTimeout(2000);

    // 3. Click Add Transaction
    console.log('Opening Add Transaction modal...');
    const addBtn = page.getByTestId('add-tx-btn').first();
    await addBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // 4. Fill form
    console.log('Filling transaction form...');
    await page.getByTestId('amount-input').fill('500');
    await page.getByTestId('merchant-input').fill('Amazon Test');
    
    // 5. Submit
    console.log('Submitting form...');
    const submitBtn = page.getByTestId('submit-tx-btn').first();
    await submitBtn.click({ force: true });
    
    await page.waitForTimeout(3000);

    // 6. Verify
    const body = await page.locator('body').innerText();
    if (body.includes('Amazon Test') && body.includes('500')) {
      console.log('✅ SUCCESS: Transaction successfully added and visible in the list!');
    } else {
      console.log('❌ FAILURE: Transaction was not found in the list after submission.');
    }

  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await browser.close();
  }
}

testAddTransaction();
