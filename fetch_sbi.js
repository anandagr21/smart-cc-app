const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.sbicard.com/en/personal/credit-cards/simplyclick-sbi-card.html', { waitUntil: 'networkidle' });
  
  // Get all text content
  const text = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync('sbi_simplyclick_text.txt', text);
  console.log('Saved to sbi_simplyclick_text.txt');
  
  await browser.close();
})();
