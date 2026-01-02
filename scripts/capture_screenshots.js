const { chromium } = require('playwright');
const path = require('path');

const PAGES = [
  { name: 'dashboard', url: 'http://localhost:5173/' },
  { name: 'agencies', url: 'http://localhost:5173/agencies' },
  { name: 'stop-and-routes', url: 'http://localhost:5173/stops' },
  { name: 'route-studio-path', url: 'http://localhost:5173/routes' },
  { name: 'route-studio-info', url: 'http://localhost:5173/routes' },
  { name: 'trip-mapping', url: 'http://localhost:5173/trips' },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'screenshots');

(async () => {
  console.log('🚀 Starting automated screenshot capture...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Set a longer timeout
  page.setDefaultTimeout(60000);

  for (const item of PAGES) {
    try {
        console.log(`📸 Capturing ${item.name}...`);
        await page.goto(item.url, { waitUntil: 'networkidle' });
        
        // Interaction logic
        if (item.name === 'route-studio-path') {
            await page.click('div[onClick]:has-text("K1")', { timeout: 5000 }).catch(() => {}); 
            await page.waitForTimeout(2000);
            await page.click('div:has-text("Path")', { timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(2000);
        }
        
        if (item.name === 'route-studio-info') {
            await page.click('div[onClick]:has-text("K1")', { timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(2000);
            await page.click('div:has-text("Info")', { timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(2000);
        }

        if (item.name === 'agencies') {
            await page.click('div[onClick]:has-text("Trans")', { timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(3000);
        }

        if (item.name === 'stop-and-routes') {
            await page.waitForTimeout(3000);
        }

        if (item.name === 'trip-mapping') {
            await page.click('div[onClick]:has-text("K1")', { timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(3000);
        }

        await page.screenshot({ 
            path: path.join(OUTPUT_DIR, `${item.name}.jpg`),
            quality: 85,
            type: 'jpeg'
        });
    } catch (err) {
        console.error(`❌ Failed to capture ${item.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('✅ All screenshots updated in assets/screenshots/');
})();
