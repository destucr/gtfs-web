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
  console.log('🚀 Starting automated screenshot capture with framed mockups...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 }, // Larger viewport to accommodate frame
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

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

        // --- Inject Frame Effect ---
        await page.evaluate(() => {
            // Apply a frame/window look to the entire body
            const body = document.body;
            body.style.backgroundColor = '#F2F2F7'; // Frame color
            body.style.padding = '40px';
            body.style.display = 'flex';
            body.style.justifyContent = 'center';
            body.style.alignItems = 'center';
            body.style.height = '100vh';
            body.style.boxSizing = 'border-box';

            const root = document.getElementById('root');
            if (root) {
                root.style.width = '1440px';
                root.style.height = '850px';
                root.style.backgroundColor = 'white';
                root.style.borderRadius = '16px';
                root.style.boxShadow = '0 30px 60px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.1)';
                root.style.overflow = 'hidden';
                root.style.position = 'relative';
                root.style.border = '1px solid rgba(0,0,0,0.05)';
            }
        });

        await page.screenshot({ 
            path: path.join(OUTPUT_DIR, `${item.name}.jpg`),
            quality: 90,
            type: 'jpeg',
            fullPage: true // Capture the entire framed viewport
        });
    } catch (err) {
        console.error(`❌ Failed to capture ${item.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('✅ All framed screenshots updated in assets/screenshots/');
})();