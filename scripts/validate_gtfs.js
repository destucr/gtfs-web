/**
 * GTFS Google Maps Compliance Validator
 * 
 * This script validates an exported GTFS ZIP file for common pitfalls 
 * that might cause issues when importing into Google Maps / Transit.
 * 
 * Usage:
 *   node scripts/validate_gtfs.js [path_to_gtfs.zip]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMP_DIR = path.join(__dirname, '..', 'temp_gtfs_validation');

function log(level, message) {
    const colors = {
        INFO: '\x1b[36m',
        PASS: '\x1b[32m',
        FAIL: '\x1b[31m',
        WARN: '\x1b[33m',
        RESET: '\x1b[0m'
    };
    console.log(`${colors[level]}[${level}]${colors.RESET} ${message}`);
}

async function validate() {
    const zipPath = process.argv[2] || 'gtfs_export.zip';

    if (!fs.existsSync(zipPath)) {
        // Try to fetch it from the backend if not found locally
        log('INFO', `ZIP file not found at ${zipPath}. Attempting to download from local backend...`);
        try {
            const response = await fetch('http://localhost:8080/api/export/gtfs');
            if (!response.ok) throw new Error(`Backend returned ${response.status}`);
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(zipPath, Buffer.from(buffer));
            log('PASS', `Downloaded GTFS ZIP from backend.`);
        } catch (err) {
            log('FAIL', `Could not find or download GTFS ZIP: ${err.message}`);
            process.exit(1);
        }
    }

    // Clean and create temp dir
    if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true });
    fs.mkdirSync(TEMP_DIR);

    log('INFO', `Extracting ${zipPath}...`);
    try {
        execSync(`unzip -o ${zipPath} -d ${TEMP_DIR}`);
    } catch (err) {
        log('FAIL', `Failed to unzip file. Ensure 'unzip' is installed. Error: ${err.message}`);
        process.exit(1);
    }

    const files = fs.readdirSync(TEMP_DIR);
    const requiredFiles = ['agency.txt', 'stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt', 'calendar.txt'];
    
    let allPassed = true;

    // 1. Check Required Files
    log('INFO', 'Checking for required GTFS files...');
    for (const req of requiredFiles) {
        if (files.includes(req)) {
            log('PASS', `Found ${req}`);
        } else {
            log('FAIL', `Missing mandatory file: ${req}`);
            allPassed = false;
        }
    }

    if (!allPassed) {
        log('FAIL', 'Missing mandatory files. Aborting deep validation.');
        process.exit(1);
    }

    // Helper to parse CSV
    const parseCSV = (filename) => {
        const content = fs.readFileSync(path.join(TEMP_DIR, filename), 'utf8');
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, i) => obj[h] = values[i]);
            return obj;
        });
        return { headers, rows };
    };

    // 2. Validate Agency
    const agency = parseCSV('agency.txt');
    log('INFO', 'Validating agency.txt...');
    agency.rows.forEach(a => {
        if (!a.agency_name) log('FAIL', 'agency_name is missing');
        if (!a.agency_url || !a.agency_url.startsWith('http')) log('WARN', `agency_url [${a.agency_url}] might be invalid. Google requires a valid URL.`);
        if (!a.agency_timezone) log('FAIL', 'agency_timezone is missing. Google Maps will reject this.');
    });

    // 3. Validate Stops
    const stops = parseCSV('stops.txt');
    log('INFO', `Validating ${stops.rows.length} stops...`);
    stops.rows.forEach(s => {
        const lat = parseFloat(s.stop_lat);
        const lon = parseFloat(s.stop_lon);
        if (isNaN(lat) || lat < -90 || lat > 90) log('FAIL', `Stop ${s.stop_id} has invalid latitude: ${s.stop_lat}`);
        if (isNaN(lon) || lon < -180 || lon > 180) log('FAIL', `Stop ${s.stop_id} has invalid longitude: ${s.stop_lon}`);
    });

    // 4. Validate Routes
    const routes = parseCSV('routes.txt');
    log('INFO', `Validating ${routes.rows.length} routes...`);
    routes.rows.forEach(r => {
        const validTypes = ['0', '1', '2', '3', '4', '5', '6', '7', '11', '12']; // Standard types
        if (!validTypes.includes(r.route_type)) log('WARN', `Route ${r.route_id} uses non-standard route_type: ${r.route_type}`);
        if (!r.route_short_name && !r.route_long_name) log('FAIL', `Route ${r.route_id} must have either short_name or long_name.`);
    });

    // 5. Validate Trips & Calendar
    const trips = parseCSV('trips.txt');
    const calendar = parseCSV('calendar.txt');
    const serviceIds = new Set(calendar.rows.map(c => c.service_id));
    log('INFO', `Checking ${trips.rows.length} trips for service_id integrity...`);
    trips.rows.forEach(t => {
        if (!serviceIds.has(t.service_id)) log('FAIL', `Trip ${t.trip_id} references missing service_id: ${t.service_id}`);
    });

    // 6. Validate Stop Times
    const stopTimes = parseCSV('stop_times.txt');
    const tripIds = new Set(trips.rows.map(t => t.trip_id));
    log('INFO', `Checking ${stopTimes.rows.length} stop_times for referential integrity...`);
    stopTimes.rows.forEach(st => {
        if (!tripIds.has(st.trip_id)) log('FAIL', `stop_times references missing trip_id: ${st.trip_id}`);
        // Simple time format check HH:MM:SS
        const timeRegex = /^\d{1,2}:\d{2}:\d{2}$/;
        if (!timeRegex.test(st.arrival_time)) log('FAIL', `Invalid arrival_time format: ${st.arrival_time} in trip ${st.trip_id}`);
    });

    log('PASS', 'Validation complete. If no [FAIL] logs appeared above, your GTFS is structurely sound for Google Maps.');
    log('INFO', 'Note: Google also performs "Common Sense" checks (e.g., stops too far apart, speeds too fast).');

    // Cleanup
    fs.rmSync(TEMP_DIR, { recursive: true });
}

validate().catch(err => {
    log('FAIL', `Unexpected error during validation: ${err.message}`);
});
