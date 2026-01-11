#!/bin/bash

# MobilityData GTFS Validator Runner
# This script pulls your local GTFS export and runs the official industry-standard validator.

EXPORT_URL="http://localhost:8080/api/export/gtfs"
ZIP_NAME="gtfs_export.zip"
OUTPUT_DIR="gtfs_report"

echo "📥 Downloading latest GTFS export from backend..."
curl -s -o $ZIP_NAME $EXPORT_URL

if [ ! -f "$ZIP_NAME" ]; then
    echo "❌ Failed to download GTFS ZIP. Is the backend running?"
    exit 1
fi

echo "🔍 Running MobilityData GTFS Validator (via Docker)..."
# Create output directory if it doesn't exist
mkdir -p $OUTPUT_DIR

# Run the official validator
# We mount the current directory to /input and the output directory to /output
docker run --rm \
  -v "$(pwd)/$ZIP_NAME":/input/gtfs.zip:ro \
  -v "$(pwd)/$OUTPUT_DIR":/output \
  ghcr.io/mobilitydata/gtfs-validator:latest \
  --input /input/gtfs.zip \
  --output /output

if [ $? -eq 0 ]; then
    echo "✅ Validation Complete!"
    echo "📄 Report generated at: $OUTPUT_DIR/report.html"
    echo "💡 Open this file in your browser to see the Google Maps-style validation results."
else
    echo "❌ Validation encountered errors."
fi
