# BullMQ - Type-Safe Job Queue

Simple, clean, and fully type-safe BullMQ implementation for Next.js.

## Features

✅ **Full type safety** - TypeScript enforces correct data types for each job
✅ **Auto-inferred types** - No manual type annotations needed in processors
✅ **Autocomplete** - Job names autocomplete when adding jobs
✅ **Simple** - Only 136 lines of code across 4 files
✅ **Clean** - No unnecessary abstractions or complexity

## File Structure

```
src/bullmq/
├── queue.ts              # Core TypedQueue class (95 lines)
├── jobs.ts               # Job definitions + queue instance (16 lines)
└── workers/
    ├── index.ts          # Worker initialization (12 lines)
    └── test-job.worker.ts # Example job processor (13 lines)
```

## Quick Start

### 1. Define Job Types

Add your job types to [jobs.ts](jobs.ts):

```typescript
export type AppJobs = {
  "test-job": { message: string };
  "send-email": { to: string; subject: string; body: string };
};
```

### 2. Create Job Processor

Create a worker file (e.g., `send-email.worker.ts`):

```typescript
import { queue } from "../jobs";

// Job type is auto-inferred from the job name!
queue.registerJob("send-email", async (job) => {
  // job.data is automatically typed: { to: string; subject: string; body: string }
  console.log("Sending email to:", job.data.to);

  // Send email logic...
});
```

Import it in [workers/index.ts](workers/index.ts):

```typescript
import "./send-email.worker";
```

### 3. Add Jobs to Queue

```typescript
import { queue } from "@/bullmq/jobs";

// ✅ Full type safety and autocomplete
await queue.add("send-email", {
  to: "user@example.com",
  subject: "Welcome!",
  body: "Thanks for signing up"
});

// ❌ TypeScript error - wrong data type
await queue.add("send-email", { wrongField: "..." });

// ❌ TypeScript error - invalid job name
await queue.add("invalid-job", { ... });
```

### 4. Run Worker

```bash
npm run worker
```

## Configuration

Environment variables (optional):

```env
BULLMQ_CONCURRENCY=4           # Default: CPU cores
BULLMQ_DEFAULT_ATTEMPTS=3      # Default: 3
BULLMQ_BACKOFF_DELAY=3000      # Default: 3000ms
```

## How It Works

### Type Inference Magic

When you register a job, TypeScript automatically infers the correct types:

```typescript
// 1. Define job type
export type AppJobs = {
  "send-email": { to: string; subject: string };
};

// 2. Register processor - types auto-inferred!
queue.registerJob("send-email", async (job) => {
  job.data.to      // ✅ TypeScript knows this is a string
  job.data.subject // ✅ TypeScript knows this is a string
  job.data.unknown // ❌ TypeScript error: property doesn't exist
});

// 3. Add job - type-checked!
await queue.add("send-email", {
  to: "user@example.com",
  subject: "Hello"
}); // ✅ Compiles

await queue.add("send-email", {
  to: 123 // ❌ TypeScript error: must be string
});
```

## Benefits

1. **Catch errors at compile time** - TypeScript prevents invalid data
2. **Autocomplete** - IDE suggests job names and data fields
3. **Refactoring is safe** - Changing job types updates all usages
4. **Self-documenting** - Types show exactly what each job expects
5. **Minimal boilerplate** - No manual type annotations needed
6. **Simple** - Easy to understand and maintain
