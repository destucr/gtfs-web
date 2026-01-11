import zipfile
import csv
import io
import os
import requests

def validate_gtfs():
    url = "http://localhost:8080/api/export/gtfs"
    print(f"📥 Downloading GTFS from {url}...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
    except Exception as e:
        print(f"❌ Failed to download: {e}")
        return

    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
        files = z.namelist()
        print(f"📦 Found {len(files)} files in bundle.")

        # Basic Required Files
        required = ['agency.txt', 'stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt', 'calendar.txt']
        for req in required:
            if req in files:
                print(f"✅ {req} present")
            else:
                print(f"❌ {req} MISSING (Google requires this)")

        # Deep Check: stops.txt (Geographic integrity)
        if 'stops.txt' in files:
            with z.open('stops.txt') as f:
                reader = csv.DictReader(io.TextIOWrapper(f))
                stops = list(reader)
                print(f"📍 Validating {len(stops)} stops...")
                for s in stops:
                    lat, lon = float(s['stop_lat']), float(s['stop_lon'])
                    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                        print(f"   ⚠️ Stop {s.get('stop_id')} has invalid coordinates: {lat}, {lon}")
                    if lat == 0 and lon == 0:
                        print(f"   ⚠️ Stop {s.get('stop_id')} is at [0,0] (Null Island). Check your data.")

        # Deep Check: agency.txt
        if 'agency.txt' in files:
            with z.open('agency.txt') as f:
                reader = csv.DictReader(io.TextIOWrapper(f))
                agencies = list(reader)
                for a in agencies:
                    if not a.get('agency_timezone'):
                        print("❌ agency_timezone is MISSING. Google Maps will reject this.")
                    else:
                        print(f"🌍 Timezone set to: {a['agency_timezone']}")

    print("\n🚀 Summary: Structural check complete.")
    print("To see this on a map, use your Project Web Viewer: cd frontend/web && npm run dev")

if __name__ == "__main__":
    validate_gtfs()
