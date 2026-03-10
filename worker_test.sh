#!/bin/bash
# Quick worker test script
echo "=== Eternal Sentinel Worker Test ==="
echo "Current date: $(date)"
echo ""

# Check if we're in the right directory
cd /Users/kurtsherman/.openclaw/workspace/sentinel

# Test if Redis is accessible
echo "Testing Redis connection..."
npx tsx -e "
import { prisma } from './src/lib/db';
console.log('DB connection test:');
await prisma.user.count().then(count => console.log('✓ DB connected - users:', count)).catch(err => console.log('✗ DB error:', err.message));

import 'dotenv/config';
import BullMq from 'bullmq';
const { Queue } = BullMq;
const { checkInQueue } = await import('./src/lib/queue');
console.log('Redis connection test:');
checkInQueue.client.ping().then(() => console.log('✓ Redis connected')).catch(err => console.log('✗ Redis error:', err.message));
console.log('Queue status:');
checkInQueue.getRepeatableJobs().then(jobs => console.log('✓ Queue accessible, jobs:', jobs.length)).catch(err => console.log('✗ Queue error:', err.message));
process.exit(0);
"

echo ""
echo "=== Environment Check ==="
echo "REDIS_URL: ${REDIS_URL:-not set}"
echo "RESEND_API_KEY: ${RESEND_API_KEY:-not set (email will fail)}"