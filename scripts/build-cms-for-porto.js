#!/usr/bin/env node

/**
 * Build script for GTFS CMS to deploy to porto-web (Cloudflare Pages)
 * 
 * This script:
 * 1. Builds frontend/cms with demo mode enabled (uses mockApi instead of real API)
 * 2. Copies the built files to porto-web/gtfs-cms
 * 3. Ensures _redirects file is in place for Cloudflare Pages routing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GTFS_WEB_ROOT = path.join(__dirname, '..');
const CMS_DIR = path.join(GTFS_WEB_ROOT, 'frontend', 'cms');
const CMS_DIST = path.join(CMS_DIR, 'dist');
const PORTO_WEB_ROOT = '/Users/destucr/Desktop/porto-web';
const PORTO_CMS_DIR = path.join(PORTO_WEB_ROOT, 'gtfs-cms');

// Cloudflare Pages redirects file content
const REDIRECTS_CONTENT = `/* /index.html 200
`;

function log(message) {
    console.log(`[build-cms] ${message}`);
}

function runCommand(command, cwd = GTFS_WEB_ROOT) {
    log(`Running: ${command}`);
    try {
        execSync(command, { 
            cwd, 
            stdio: 'inherit',
            env: { ...process.env }
        });
    } catch (error) {
        console.error(`❌ Command failed: ${command}`);
        process.exit(1);
    }
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        throw new Error(`Source directory does not exist: ${src}`);
    }

    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
        log(`Created directory: ${dest}`);
    }

    // Copy all files and directories
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            log(`Copied: ${entry.name}`);
        }
    }
}

function main() {
    log('🚀 Starting GTFS CMS build for porto-web deployment...\n');

    // Step 1: Build frontend/cms with demo mode
    log('📦 Step 1: Building frontend/cms with demo mode...');
    runCommand('npm run build:demo', CMS_DIR);
    log('✅ Build completed!\n');

    // Step 2: Verify dist directory exists
    if (!fs.existsSync(CMS_DIST)) {
        throw new Error(`Build output not found: ${CMS_DIST}`);
    }
    log('✅ Build output verified\n');

    // Step 3: Clean destination directory (optional - comment out if you want to keep old files)
    if (fs.existsSync(PORTO_CMS_DIR)) {
        log('🧹 Cleaning existing porto-web/gtfs-cms directory...');
        fs.rmSync(PORTO_CMS_DIR, { recursive: true, force: true });
        log('✅ Cleaned\n');
    }

    // Step 4: Copy dist to porto-web/gtfs-cms
    log('📋 Step 2: Copying build output to porto-web/gtfs-cms...');
    copyDir(CMS_DIST, PORTO_CMS_DIR);
    log('✅ Files copied!\n');

    // Step 5: Ensure _redirects file exists
    log('📋 Step 3: Ensuring _redirects file for Cloudflare Pages...');
    const redirectsPath = path.join(PORTO_CMS_DIR, '_redirects');
    fs.writeFileSync(redirectsPath, REDIRECTS_CONTENT);
    log('✅ _redirects file created/updated!\n');

    log('🎉 Success! GTFS CMS is ready for Cloudflare Pages deployment.');
    log(`📁 Output location: ${PORTO_CMS_DIR}`);
    log('\n💡 Next steps:');
    log('   1. cd /Users/destucr/Desktop/porto-web');
    log('   2. Commit and push the changes');
    log('   3. Cloudflare Pages will automatically deploy');
}

// Run the script
try {
    main();
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

