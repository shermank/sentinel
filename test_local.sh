#!/bin/bash
echo "=== Eternal Sentinel Local Testing Setup ==="
echo "Current directory: $(pwd)"
echo "Starting Redis in background (if not running)..."

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
  echo "Starting local Redis..."
  redis-server --daemonize yes --port 6379 --timeout 0 > /dev/null 2>&1 &
  sleep 2
  if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis started successfully"
  else
    echo "❌ Failed to start Redis"
    exit 1
  fi
else
  echo "✅ Redis already running"
fi

# Create minimal .env.local for testing
echo "Creating test environment..."
cat > .env.local << EOF
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/eternal_sentinel?schema=public"
REDIS_URL=redis://localhost:6379
AUTH_SECRET="test-secret-key-for-local-development"
EMAIL_FROM=noreply@eternal-sentinel.test
CHECK_IN_POLL_INTERVAL=30000  # 30 seconds for testing
EOF

echo "✅ Test environment configured"
echo ""
echo "Next steps:"
echo "1. Start web server: npm run dev"
echo "2. Start worker: node workers/index.ts"
echo "3. Test check-in flow"