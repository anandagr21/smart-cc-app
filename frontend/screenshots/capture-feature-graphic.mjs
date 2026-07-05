import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'feature-graphic.html');
const outPath = join(__dirname, 'feature-graphic.png');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1024, height: 500 });
await page.goto(`file://${htmlPath}`);
await page.waitForTimeout(1000); // let fonts load
await page.screenshot({ path: outPath, type: 'png' });
console.log(`Feature graphic saved to ${outPath}`);
await browser.close();
