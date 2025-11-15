# Redis Storage Management for BullMQ

## 1. Reading Redis Storage

### Option A: RedisInsight (Recommended GUI Tool)

**Best for:** Visual inspection, browsing keys, real-time monitoring

**Installation:**
```bash
# Download from: https://redis.io/insight/
# Or via package managers:
brew install --cask redisinsight  # macOS
# Or download installer for Windows/Linux
```

**Setup:**
1. Open RedisInsight
2. Add your Redis connection using your `REDIS_URL`
3. Browse BullMQ keys under the "Browser" tab

**What you'll see:**
- `bull:main:*` - All BullMQ queue data
- `bull:main:wait` - Jobs waiting to be processed
- `bull:main:active` - Currently processing jobs
- `bull:main:completed` - Completed jobs (auto-cleaned)
- `bull:main:failed` - Failed jobs (auto-cleaned)
- `bull:main:id` - Job ID counter

### Option B: redis-cli (Command Line)

**Best for:** Quick checks, scripts, production servers

**Installation:**
```bash
# Windows (via WSL or download from Redis website)
# macOS
brew install redis

# Linux
sudo apt-get install redis-tools
```

**Common Commands:**
```bash
# Connect to Redis
redis-cli -u "your-redis-url"

# List all BullMQ keys
KEYS bull:main:*

# Count keys by pattern
KEYS bull:main:completed | wc -l

# Get waiting jobs count
LLEN bull:main:wait

# Get active jobs count
LLEN bull:main:active

# View a specific job
HGETALL bull:main:1

# View job data
HGET bull:main:1 data

# Monitor Redis in real-time
MONITOR

# Get Redis memory usage
INFO memory

# Get total number of keys
DBSIZE
```

### Option C: Using Your Existing ioredis Client

**Best for:** Programmatic inspection, debugging, custom scripts

Create `src/bullmq/inspect-redis.ts`:

```typescript
import { redis } from "@/db/redis/config";

async function inspectRedis() {
  console.log("🔍 Inspecting Redis Storage...\n");

  // Count jobs by status
  const waiting = await redis.llen("bull:main:wait");
  const active = await redis.llen("bull:main:active");
  const completed = await redis.zcard("bull:main:completed");
  const failed = await redis.zcard("bull:main:failed");

  console.log("📊 Job Counts:");
  console.log(`  Waiting:   ${waiting}`);
  console.log(`  Active:    ${active}`);
  console.log(`  Completed: ${completed}`);
  console.log(`  Failed:    ${failed}`);
  console.log();

  // Get all BullMQ keys
  const keys = await redis.keys("bull:main:*");
  console.log(`📦 Total BullMQ Keys: ${keys.length}`);
  console.log("Key patterns:", [...new Set(keys.map(k => k.split(":").slice(0, 3).join(":")))]);
  console.log();

  // Get memory usage
  const memory = await redis.info("memory");
  const usedMemory = memory.match(/used_memory_human:(.+)/)?.[1];
  console.log(`💾 Redis Memory Usage: ${usedMemory}`);

  await redis.quit();
}

inspectRedis();
```

**Run it:**
```bash
tsx src/bullmq/inspect-redis.ts
```

## 2. Manual Cleanup

### Clean Specific BullMQ Data

```bash
# Connect to redis-cli first
redis-cli -u "your-redis-url"

# Delete all completed jobs
DEL bull:main:completed

# Delete all failed jobs
DEL bull:main:failed

# Delete all waiting jobs (⚠️ careful - this cancels pending jobs!)
DEL bull:main:wait

# Delete a specific job by ID
DEL bull:main:123

# Delete all BullMQ keys for "main" queue
KEYS bull:main:* | xargs redis-cli DEL
```

### Clean Everything (Nuclear Option)

```bash
# ⚠️ WARNING: This deletes EVERYTHING in Redis!
FLUSHDB   # Delete all keys in current database
FLUSHALL  # Delete all keys in ALL databases
```

### Programmatic Cleanup Script

Create `src/bullmq/cleanup-redis.ts`:

```typescript
import { redis } from "@/db/redis/config";
import { Queue } from "bullmq";

async function cleanup() {
  const queue = new Queue("main", { connection: redis });

  console.log("🧹 Cleaning up Redis...\n");

  // Clean completed jobs
  await queue.clean(0, 0, "completed");
  console.log("✅ Cleaned all completed jobs");

  // Clean failed jobs
  await queue.clean(0, 0, "failed");
  console.log("✅ Cleaned all failed jobs");

  // Optional: Clean old jobs (older than 24 hours)
  // await queue.clean(24 * 60 * 60 * 1000, 0, "completed");
  // await queue.clean(24 * 60 * 60 * 1000, 0, "failed");

  await queue.close();
  await redis.quit();
  console.log("\n✨ Cleanup complete!");
}

cleanup();
```

**Run it:**
```bash
tsx src/bullmq/cleanup-redis.ts
```

## 3. Automatic Cleanup (Already Configured!)

### Current Auto-Cleanup Settings

Your BullMQ implementation **already has automatic cleanup enabled**:

**Location:** `src/bullmq/queue.ts` (lines 75-76)

```typescript
removeOnComplete: { count: 1000 },  // Keep last 1000 completed jobs
removeOnFail: { count: 5000 },      // Keep last 5000 failed jobs
```

### What This Means

✅ **Completed jobs:** Automatically deleted after the last 1000 are kept
✅ **Failed jobs:** Automatically deleted after the last 5000 are kept
✅ **Active/Waiting jobs:** Automatically cleaned up when processed
✅ **Memory:** Stays bounded and won't grow indefinitely

### What Gets Stored

**Temporary (auto-cleaned):**
- Job data while waiting/processing
- Job results after completion (up to 1000)
- Error messages for failed jobs (up to 5000)

**Permanent (until manually deleted):**
- Job ID counter (`bull:main:id`)
- Queue metadata

### Adjusting Auto-Cleanup

If you want different retention:

```typescript
// Keep fewer completed jobs (less memory)
removeOnComplete: { count: 100 },

// Keep more failed jobs for debugging
removeOnFail: { count: 10000 },

// Delete completed jobs immediately
removeOnComplete: true,

// Keep completed jobs with age limit
removeOnComplete: { age: 3600 }, // 1 hour in seconds

// Keep last 500 jobs AND older than 1 hour
removeOnComplete: { count: 500, age: 3600 },
```

## 4. Best Practices

### Monitoring

**Add to your monitoring/logging:**

```typescript
import { queue } from "@/bullmq/jobs";

// Check queue health
async function checkQueueHealth() {
  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  const failed = await queue.getFailedCount();

  if (failed > 100) {
    console.warn("⚠️ High number of failed jobs:", failed);
  }

  if (waiting > 1000) {
    console.warn("⚠️ Job queue backing up:", waiting);
  }
}
```

### When to Manually Clean

**Clean manually if:**
- 🔴 Redis memory usage is high (check with `INFO memory`)
- 🔴 You're debugging and want a fresh start
- 🔴 You changed job structure and old jobs are incompatible
- 🔴 Failed job count is unusually high

**Don't clean manually if:**
- ✅ Everything is working normally
- ✅ Auto-cleanup is handling it (which it is!)
- ✅ You want to inspect failed jobs for debugging

### Storage Growth Prevention

Your current setup is **already optimized**:
- ✅ Auto-cleanup enabled
- ✅ Reasonable retention limits
- ✅ Jobs are processed and removed

**Additional protection:**
```typescript
// Add job expiration (jobs auto-fail after timeout)
await queue.add("test-job", data, {
  timeout: 30000, // 30 seconds max processing time
});

// Add job TTL (job expires if not processed)
await queue.add("test-job", data, {
  removeOnComplete: true,  // Delete immediately after completion
  removeOnFail: true,      // Delete immediately after failure
});
```

## 5. Quick Reference

### Commands Cheat Sheet

```bash
# View waiting jobs count
redis-cli -u "$REDIS_URL" LLEN bull:main:wait

# View all BullMQ keys
redis-cli -u "$REDIS_URL" KEYS "bull:main:*"

# Count all BullMQ keys
redis-cli -u "$REDIS_URL" KEYS "bull:main:*" | wc -l

# Delete all completed jobs
redis-cli -u "$REDIS_URL" DEL bull:main:completed

# Check Redis memory
redis-cli -u "$REDIS_URL" INFO memory | grep used_memory_human

# Monitor Redis in real-time
redis-cli -u "$REDIS_URL" MONITOR
```

### NPM Scripts (Add to package.json)

```json
{
  "scripts": {
    "redis:inspect": "tsx src/bullmq/inspect-redis.ts",
    "redis:clean": "tsx src/bullmq/cleanup-redis.ts"
  }
}
```

## Summary

✅ **You DON'T need to worry about cleanup** - It's already configured!
✅ **Current settings are good** - 1000 completed, 5000 failed jobs retained
✅ **For inspection:** Use RedisInsight (GUI) or redis-cli (terminal)
✅ **For manual cleanup:** Only needed in exceptional cases
✅ **Memory usage:** Should stay stable with current auto-cleanup

Your BullMQ setup is production-ready with proper automatic cleanup! 🎉
