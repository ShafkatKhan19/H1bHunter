#!/bin/bash

# Initialize jobs on Railway via admin endpoint
# Usage: ./init-railway-jobs.sh <Railway App URL> <Admin Key>

RAILWAY_URL="${1:-https://web-production-1407f.up.railway.app}"
ADMIN_KEY="${2:-init-dev-key}"

echo "🔨 Initializing jobs on Railway..."
echo "URL: $RAILWAY_URL"
echo ""

curl -X POST "$RAILWAY_URL/api/admin/init-jobs?key=$ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d '{}' | jq .

echo ""
echo "✅ Done! Check the website to see if jobs are now visible."
