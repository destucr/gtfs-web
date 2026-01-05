#!/usr/bin/env node

/**
 * Build script for both GTFS CMS and Web Viewer to deploy to porto-web (Cloudflare Pages)
 * 
 * This script builds both frontends and copies them to porto-web
 */

const { execSync } = require('child_process');
const path = require('path');

const GTFS_WEB_ROOT = path.join(__dirname, '..');

function log(message) {
    console.log(`[build-all] ${message}`);
}

function runScript(scriptPath) {
    log(`Running: ${scriptPath}`);
    try {
        execSync(`node ${scriptPath}`, { 
            cwd: GTFS_WEB_ROOT,
            stdio: 'inherit'
        });
    } catch (error) {
        console.error(`❌ Script failed: ${scriptPath}`);
        process.exit(1);
    }
}

function main() {
    const PORTO_WEB_PATH = process.env.PORTO_WEB_PATH || '../porto-web';
    log(`🚀 Building both GTFS CMS and Web Viewer for ${PORTO_WEB_PATH}...\n`);

    // Build CMS
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('Building GTFS CMS...');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    runScript(path.join(__dirname, 'build-cms-for-porto.js'));

    log('\n');

    // Build Web Viewer
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('Building GTFS Web Viewer...');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    runScript(path.join(__dirname, 'build-web-for-porto.js'));

    log('\n🎉 All builds completed successfully!');
    log(`📁 Both applications are ready in ${PORTO_WEB_PATH}:`);
    log(`   - ${path.join(PORTO_WEB_PATH, 'gtfs-cms')}`);
    log(`   - ${path.join(PORTO_WEB_PATH, 'gtfs-web')}`);
}

// Run the script
try {
    main();
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

