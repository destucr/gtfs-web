const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:8080/api';
const OUTPUT_FILES = [
    path.join(__dirname, '..', 'frontend', 'cms', 'src', 'demo-data.json'),
    path.join(__dirname, '..', 'frontend', 'web', 'src', 'demo-data.json')
];

const ENDPOINTS = [
    '/agencies',
    '/routes',
    '/stops',
    '/trips',
    '/shapes',
    '/stop-routes',
    '/settings',
    '/activity-logs'
];

async function exportData() {
    console.log('🚀 Starting Deep Demo Data Export...');
    const data = {};

    for (const endpoint of ENDPOINTS) {
        try {
            console.log(`📦 Fetching ${endpoint}...`);
            const res = await fetch(`${BACKEND_URL}${endpoint}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            data[endpoint] = await res.json();
        } catch (err) {
            console.warn(`⚠️ Failed to fetch ${endpoint}: ${err.message}`);
            data[endpoint] = [];
        }
    }

    // Capture ALL shapes and trip stops
    console.log('🔗 Fetching secondary dependencies...');

    // The /shapes endpoint returns a list of strings (IDs)
    const shapeIds = data['/shapes'] || [];
    const trips = data['/trips'] || [];

    data['/shapes/detail'] = {};
    for (const id of shapeIds) {
        try {
            console.log(`  - Fetching shape detail: ${id}...`);
            const res = await fetch(`${BACKEND_URL}/shapes/${id}`);
            if (res.ok) {
                data['/shapes/detail'][id] = await res.json();
            }
        } catch (e) {
            console.error(`Failed to fetch shape ${id}: ${e.message}`);
        }
    }

    data['/trips/stops'] = {};
    for (const trip of trips) {
        try {
            console.log(`  - Fetching stops for trip ${trip.id}...`);
            const res = await fetch(`${BACKEND_URL}/trips/${trip.id}/stops`);
            if (res.ok) {
                data['/trips/stops'][trip.id] = await res.json();
            }
        } catch (e) {
            console.error(`Failed to fetch stops for trip ${trip.id}: ${e.message}`);
        }
    }

    data['/stops/times'] = {};
    const stops = data['/stops'] || [];
    for (const stop of stops) {
        try {
            console.log(`  - Fetching schedule for stop ${stop.id}...`);
            const res = await fetch(`${BACKEND_URL}/stops/${stop.id}/times`);
            if (res.ok) {
                data['/stops/times'][stop.id] = await res.json();
            }
        } catch (e) {
            console.error(`Failed to fetch schedule for stop ${stop.id}: ${e.message}`);
        }
    }

    for (const file of OUTPUT_FILES) {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        console.log(`✅ Success! Demo data saved to ${file}`);
    }
    console.log(`📊 Total size: ${Math.round(JSON.stringify(data).length / 1024)} KB`);
}

exportData();
