const { chromium } = require('playwright');
const path = require('path');

const PAGES = [
  { name: 'dashboard', url: 'http://localhost:5173/' },
  { name: 'stop-and-routes', url: 'http://localhost:5173/stops' },
  { name: 'route-studio-path', url: 'http://localhost:5173/routes' },
  { name: 'route-studio-info', url: 'http://localhost:5173/routes' }, // We'll handle tab switching
];

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'screenshots');

(async () => {
  console.log('🚀 Starting automated screenshot capture...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High DPI for crisp images
  });
  const page = await context.newPage();

  for (const item of PAGES) {
    console.log(`📸 Capturing ${item.name}...`);
    await page.goto(item.url, { waitUntil: 'networkidle' });
    
    // Custom logic for specific pages
    if (item.name === 'route-studio-path') {
        // Select first route to show map
        await page.click('div[onClick]:has-text("K1")'); 
        await page.waitForTimeout(1000);
        // Switch to Path tab
        await page.click('div:has-text("Path")');
        await page.waitForTimeout(1000);
    }
    
    if (item.name === 'route-studio-info') {
        await page.click('div[onClick]:has-text("K1")');
        await page.waitForTimeout(1000);
        await page.click('div:has-text("Info")');
        await page.waitForTimeout(1000);
    }

    if (item.name === 'stop-and-routes') {
        await page.waitForTimeout(2000); // Wait for map to settle
    }

    await page.screenshot({ 
        path: path.join(OUTPUT_DIR, `${item.name}.jpg`),
        quality: 80,
        type: 'jpeg'
    });
  }

  await browser.close();
  console.log('✅ All screenshots updated in assets/screenshots/');
})();
