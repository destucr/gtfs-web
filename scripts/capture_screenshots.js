const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

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
const PORTFOLIO_DIR = '/Users/destucr/Desktop/porto-web/public/images/gtfs-web';
const CWEBP_PATH = '/opt/homebrew/bin/cwebp';

(async () => {
    console.log('🚀 Starting automated screenshot capture with cwebp conversion...');

    // Ensure directories exist
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    if (!fs.existsSync(PORTFOLIO_DIR)) {
        console.warn(`⚠️ Portfolio directory not found: ${PORTFOLIO_DIR}`);
    } else {
        console.log(`📁 Target portfolio directory: ${PORTFOLIO_DIR}`);
    }

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

            if (item.name === 'dashboard') {
                const statCards = await page.$$('div[class*="StatCard"]');
                if (statCards.length > 0) {
                    await statCards[0].hover();
                    await page.waitForTimeout(1000);
                }
            }

            if (item.name === 'route-studio-path') {
                await selectFirstItem();
                await page.click('button:has-text("Path")').catch(() => { });
                // Show the active snapping zap icon
                await page.waitForSelector('svg:has([class*="Zap"])', { timeout: 10000 }).catch(() => { });
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
                // Hover over a linked route if present
                const linkedRoutes = await page.$$('div[class*="flex items-center gap-3"]');
                if (linkedRoutes.length > 0) {
                    await linkedRoutes[0].hover();
                }
                await page.waitForTimeout(2000);
            }

            if (item.name === 'trip-mapping') {
                await selectFirstItem();
                // Expand a Travel Duration if possible
                const travelInputs = await page.$$('input[type="number"]');
                if (travelInputs.length > 0) {
                    await travelInputs[0].focus();
                }
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
                const routes = await page.$$('button');
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
                    root.style.zIndex = '1';
                }
            });

            const tempJpegPath = path.join(OUTPUT_DIR, `${item.name}.jpg`);
            const webpPath = path.join(OUTPUT_DIR, `${item.name}.webp`);
            const portfolioWebpPath = path.join(PORTFOLIO_DIR, `${item.name}.webp`);

            await page.screenshot({
                path: tempJpegPath,
                quality: 90,
                type: 'jpeg',
                fullPage: true
            });

            // Convert to webp using cwebp
            console.log(`✨ Converting ${item.name} to WebP...`);
            try {
                if (fs.existsSync(CWEBP_PATH)) {
                    execSync(`"${CWEBP_PATH}" -q 90 "${tempJpegPath}" -o "${webpPath}"`);
                } else {
                    // Try global cwebp
                    execSync(`cwebp -q 90 "${tempJpegPath}" -o "${webpPath}"`);
                }

                // Copy webp to portfolio
                if (fs.existsSync(PORTFOLIO_DIR)) {
                    fs.copyFileSync(webpPath, portfolioWebpPath);
                    console.log(`📤 Exported to portfolio: ${item.name}.webp`);
                }

                // Optionally remove temp JPEG
                fs.unlinkSync(tempJpegPath);
            } catch (convErr) {
                console.error(`⚠️ WebP conversion failed for ${item.name}: ${convErr.message}`);
                // If cwebp fails, maybe fall back to keeping the JPEG or use sips for JPEG->PNG then cwebp (too complex)
            }
        } catch (err) {
            console.error(`❌ Failed to capture ${item.name}: ${err.message}`);
        }
    }

    await browser.close();
    console.log('✅ All screenshots captured, converted to WebP, and exported!');
})();