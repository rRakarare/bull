# BullMQ Job Queue System

A type-safe BullMQ implementation using a **single queue** with multiple job types, providing full TypeScript type safety for job data.

## Features

- ✅ **Single Queue Architecture**: One queue for all job types
- ✅ **Full Type Safety**: Job data is typed based on job name
- ✅ **Autocomplete Support**: Job names and data types are auto-suggested
- ✅ **Centralized Job Registry**: All job types defined in one place
- ✅ **Modular Workers**: Easy to add new job processors
- ✅ **Auto-cleanup**: Configurable cleanup of completed/failed jobs
- ✅ **Smart Retries**: Exponential backoff for failed jobs
- ✅ **Graceful Shutdown**: Properly close all connections

## Architecture

```
bullmq/
├── config.ts          # Configuration (concurrency, retries, etc.)
├── registry.ts        # Queue and worker management, helper types
├── jobs.ts            # Central job type definitions (AppJobRegistry)
├── queues.ts          # Single typed queue export
├── index.ts           # Main exports
└── workers/
    ├── index.ts       # Worker creation and startup
    └── *.worker.ts    # Individual job processors
```

## Quick Start

### 1. Define Your Job Types

Add your job types to `jobs.ts`:

```typescript
// jobs.ts
export interface AppJobRegistry {
  'test-job': JobDefinition<
    { message: string },
    void
  >;

  'send-email': JobDefinition<
    { to: string; subject: string; body: string },
    { messageId: string }
  >;

  'process-upload': JobDefinition<
    { fileId: string; userId: string },
    { processedRows: number }
  >;
}
```

### 2. Create a Job Processor

Create a new worker file:

```typescript
// workers/send-email.worker.ts
import { queue } from "../queues";
import type { AppJobRegistry } from "../jobs";
import type { ProcessorFor } from "../registry";

export const sendEmailProcessor: ProcessorFor<AppJobRegistry, 'send-email'> = async (job) => {
  const { to, subject, body } = job.data; // Fully typed!

  // Send email logic
  const messageId = await sendEmail(to, subject, body);

  return { messageId }; // Type checked!
};

// Register the processor
queue.registerJob('send-email', sendEmailProcessor);
```

### 3. Register the Worker

Import your worker in `workers/index.ts`:

```typescript
// workers/index.ts
export * from "./send-email.worker";
// The worker is automatically created and started
```

### 4. Start the Worker

Import workers in your server startup:

```typescript
// server.ts or app.ts
import "./bullmq/workers"; // Starts the worker
```

### 5. Add Jobs with Type Safety

```typescript
import { queue } from "@/bullmq";

// ✅ Correct - TypeScript is happy
await queue.add('send-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for signing up'
});

// ❌ Type error - wrong data structure
await queue.add('send-email', {
  message: 'hello'  // TypeScript error: Property 'to' is missing
});

// ✅ Autocomplete works!
await queue.add('sen...' // Suggests: 'send-email', 'test-job', etc.
```

## How It Works

### Single Queue, Multiple Job Types

Unlike traditional BullMQ setups with multiple queues, this implementation uses:

1. **One Queue**: All jobs go into a single queue named `"main"`
2. **Job Name Routing**: Jobs are identified by their name (e.g., `'send-email'`, `'test-job'`)
3. **Processor Registry**: Each job name is registered with its processor function
4. **Smart Routing**: The worker automatically routes jobs to the correct processor

### Type Safety Flow

```typescript
// 1. Define job type in jobs.ts
'send-email': JobDefinition<{ to: string }, { messageId: string }>

// 2. Create processor with typed function
JobProcessor<{ to: string }, { messageId: string }>

// 3. Add job with type checking
queue.add('send-email', { to: '...' })  // Data must match type!
         ^^^^^^^^^^^^^^  ^^^^^^^^^^^^
         Autocomplete    Type checked
```

## Configuration

### Environment Variables

```bash
BULLMQ_CONCURRENCY=4           # Jobs processed simultaneously
BULLMQ_DEFAULT_ATTEMPTS=3      # Retry attempts
BULLMQ_BACKOFF_DELAY=3000     # Retry delay (ms)
```

### Custom Options

Override defaults in `config.ts` or per-worker:

```typescript
export const worker = queue.createWorker({
  concurrency: 10,  // Process 10 jobs at once
});
```

## Advanced Usage

### Jobs with Return Values

```typescript
// Define job with result type
'calculate-stats': JobDefinition<
  { userId: string },
  { totalOrders: number; revenue: number }
>;

// Processor returns typed result
export const calculateStatsProcessor = async (job) => {
  const stats = await calculateUserStats(job.data.userId);
  return stats; // Type must match result type
};

// Get result when job completes
const job = await queue.add('calculate-stats', { userId: '123' });
const result = await job.waitUntilFinished(); // Typed result!
```

### Job Options

```typescript
await queue.add('send-email', data, {
  delay: 5000,           // Wait 5 seconds before processing
  priority: 1,           // Higher priority
  attempts: 5,           // Override default retry attempts
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});
```

### Graceful Shutdown

```typescript
import { queueRegistry } from "@/bullmq";

// On app shutdown
await queueRegistry.shutdown();
```

## Complete Example: File Processing Job

```typescript
// 1. Add to jobs.ts
export interface AppJobRegistry {
  'process-csv': JobDefinition<
    { fileId: string; userId: string; options: ProcessOptions },
    { processedRows: number; errors: number }
  >;
}

// 2. Create worker (workers/process-csv.worker.ts)
import { queue } from "../queues";
import type { AppJobRegistry } from "../jobs";
import type { ProcessorFor } from "../registry";

export const processCsvProcessor: ProcessorFor<AppJobRegistry, 'process-csv'> = async (job) => {
  const { fileId, userId, options } = job.data;

  // Update progress
  await job.updateProgress(10);

  // Process file
  const result = await processFile(fileId, userId, options);

  await job.updateProgress(100);

  return {
    processedRows: result.rows,
    errors: result.errors
  };
};

queue.registerJob('process-csv', processCsvProcessor);

// 3. Register in workers/index.ts
export * from "./process-csv.worker";

// 4. Use in your app
import { queue } from "@/bullmq";

await queue.add('process-csv', {
  fileId: 'file-123',
  userId: 'user-456',
  options: { skipHeader: true }
});
```

## Best Practices

1. **Define types first**: Add job to `jobs.ts` before creating processor
2. **One file per job**: Keep processors focused and testable
3. **Type your processors**: Use `ProcessorFor<AppJobRegistry, 'job-name'>` for clean, type-safe processors
4. **Return values**: Always match the result type from `jobs.ts`
5. **Handle errors**: Errors trigger automatic retries
6. **Update progress**: Use `job.updateProgress()` for long-running jobs

## Monitoring

The worker automatically logs:

```
Queue created: main
Job processor registered: test-job
Job processor registered: send-email
Worker created for queue: main
[main] Job send-email#123 completed
[main] Job process-csv#124 failed: File not found
```

## Troubleshooting

- **"No processor registered"**: Ensure the worker file is imported in `workers/index.ts`
- **Type errors on `queue.add`**: Check that job name exists in `AppJobRegistry`
- **Jobs not processing**: Verify `./bullmq/workers` is imported in server startup
- **Redis connection errors**: Check Redis config in `@/db/redis/config`

## Migration from Multi-Queue Setup

If you have an existing multi-queue setup:

1. Merge all job types into `AppJobRegistry` in `jobs.ts`
2. Update processors to use `queue.registerJob()`
3. Replace `queueName.add()` with `queue.add('job-name', ...)`
4. Remove individual queue exports from `queues/index.ts`

Old:
```typescript
await emailQueue.add({ to: '...' });
```

New:
```typescript
await queue.add('send-email', { to: '...' });
```
