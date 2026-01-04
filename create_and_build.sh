#!/bin/bash
export EXPO_TOKEN=t67dFVu9db_mswhd3k0t7bpMStVmQkOn7hBDFMBo

echo "Step 1: Creating EAS project..."
echo "y" | ./node_modules/.bin/eas init --non-interactive 2>&1 || true

echo ""
echo "Step 2: Checking app.json..."
cat app.json | grep projectId || echo "Project ID not found"

echo ""
echo "Step 3: Starting build..."
./node_modules/.bin/eas build --platform android --profile production --non-interactive 2>&1

