const { chromium } = require('playwright');
const path = require('path');

const PAGES = [
    { name: 'dashboard', url: 'http://localhost:5173/' },
    { name: 'agencies', url: 'http://localhost:5173/agencies' },
    { name: 'stop-and-routes', url: 'http://localhost:5173/stops' },
    { name: 'route-studio-path', url: 'http://localhost:5173/routes' },
    { name: 'route-studio-info', url: 'http://localhost:5173/routes' },
    { name: 'trip-mapping', url: 'http://localhost:5173/trips' },
    { name: 'micro-interactions', url: 'http://localhost:5173/stops' },
    { name: 'web-viewer', url: 'http://localhost:3000/' },
    { name: 'web-viewer-route', url: 'http://localhost:3000/' },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'screenshots');

(async () => {
    console.log('🚀 Starting automated screenshot capture with framed mockups...');
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 },
        deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    page.setDefaultTimeout(60000);

    for (const item of PAGES) {
        try {
            console.log(`📸 Capturing ${item.name}...`);
            await page.goto(item.url, { waitUntil: 'networkidle' });

            // --- Interaction Logic ---

            const selectFirstItem = async () => {
                await page.waitForSelector('div[class*="cursor-pointer"]', { timeout: 15000 });
                const items = await page.$$('div[class*="cursor-pointer"]');
                if (items.length > 0) {
                    await items[0].click();
                    await page.waitForTimeout(1000);
                }
            };

            if (item.name === 'route-studio-path') {
                await selectFirstItem();
                await page.click('button:has-text("Path")').catch(() => { });
                await page.waitForTimeout(2000);
            }

            if (item.name === 'route-studio-info') {
                await selectFirstItem();
                await page.click('button:has-text("Details")').catch(() => { });
                await page.waitForTimeout(2000);
            }

            if (item.name === 'agencies') {
                await selectFirstItem();
                await page.waitForTimeout(3000); // Wait for geometry to load
            }

            if (item.name === 'stop-and-routes') {
                await selectFirstItem();
                await page.click('button:has-text("Links")').catch(() => { }); // Show route assignments
                await page.waitForTimeout(2000);
            }

            if (item.name === 'trip-mapping') {
                await selectFirstItem();
                await page.waitForTimeout(3000);
            }

            if (item.name === 'micro-interactions') {
                await page.waitForSelector('div[class*="cursor-pointer"]', { timeout: 10000 });
                const stops = await page.$$('div[class*="cursor-pointer"]');
                if (stops.length > 1) {
                    await stops[1].hover();
                    await page.waitForTimeout(1500);
                }
            }

            if (item.name === 'web-viewer') {
                await page.waitForTimeout(3000); // Wait for map load
            }

            if (item.name === 'web-viewer-route') {
                await page.waitForSelector('button', { timeout: 15000 });
                // Click the first route in the sidebar list (UnstyledButton)
                const routes = await page.$$('button');
                // We need to be careful to pick the route list item, not the theme toggle or search.
                // Based on structure: Sidebar -> ScrollArea -> Stack -> UnstyledButton
                // We can look for text or the circle badge structure.
                // Simpler: Click the 3rd button (Dark mode is 1, maybe search is input).
                // Actually, the route buttons are UnstyledButtons in the scroll area.
                if (routes.length > 2) {
                    await routes[2].click();
                    await page.waitForTimeout(2000);
                }
            }

            // --- Inject Frame Effect ---
            await page.evaluate(() => {
                const body = document.body;
                body.style.backgroundColor = '#F2F2F7';
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
                fullPage: true
            });
        } catch (err) {
            console.error(`❌ Failed to capture ${item.name}: ${err.message}`);
        }
    }

    await browser.close();
    console.log('✅ All framed screenshots updated in assets/screenshots/');
})();