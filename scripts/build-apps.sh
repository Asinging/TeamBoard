#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building backend..."
cd "$ROOT_DIR/backend"
npm install
npm run build || { echo "Backend build failed"; exit 1; }

echo "Building frontend..."
cd "$ROOT_DIR/frontend"
npm install
npm run build || { echo "Frontend build failed"; exit 1; }

echo "All builds completed successfully!"
