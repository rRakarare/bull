import { Queue, Worker, type Job, type WorkerOptions } from "bullmq";
import { redis } from "@/db/redis/config";
import * as os from "os";

// Configuration
const config = {
  concurrency: process.env.BULLMQ_CONCURRENCY
    ? parseInt(process.env.BULLMQ_CONCURRENCY, 10)
    : os.cpus().length,
  defaultAttempts: process.env.BULLMQ_DEFAULT_ATTEMPTS
    ? parseInt(process.env.BULLMQ_DEFAULT_ATTEMPTS, 10)
    : 3,
  backoffDelay: process.env.BULLMQ_BACKOFF_DELAY
    ? parseInt(process.env.BULLMQ_BACKOFF_DELAY, 10)
    : 3000,
};

// Type-safe job processor (no result type needed)
type JobProcessor<TData> = (job: Job<TData>) => Promise<void>;

// Type-safe queue class
export class TypedQueue<TJobs extends Record<string, any>> {
  private queue: Queue;
  private processors = new Map<keyof TJobs, JobProcessor<any>>();

  constructor(queueName: string) {
    this.queue = new Queue(queueName, {
      connection: redis,
      defaultJobOptions: {
        attempts: config.defaultAttempts,
        backoff: { type: "exponential", delay: config.backoffDelay },
      },
    });
  }

  // Register job processor with automatic type inference
  registerJob<K extends keyof TJobs>(
    jobName: K,
    processor: JobProcessor<TJobs[K]>
  ): void {
    if (this.processors.has(jobName)) {
      console.warn(`Job "${String(jobName)}" already registered`);
      return;
    }
    this.processors.set(jobName, processor);
    console.log(`Job registered: ${String(jobName)}`);
  }

  // Add job with type-safe data
  async add<K extends keyof TJobs>(
    jobName: K,
    data: TJobs[K],
    options?: Parameters<Queue["add"]>[2]
  ): Promise<Job<TJobs[K]>> {
    return this.queue.add(String(jobName), data, options) as Promise<Job<TJobs[K]>>;
  }

  // Create worker that processes all registered jobs
  createWorker(options?: Partial<WorkerOptions>): Worker {
    const worker = new Worker(
      this.queue.name,
      async (job) => {
        const processor = this.processors.get(job.name as keyof TJobs);
        if (!processor) {
          throw new Error(
            `No processor for "${job.name}". Available: ${Array.from(this.processors.keys()).join(", ")}`
          );
        }
        return processor(job);
      },
      {
        connection: redis,
        concurrency: config.concurrency,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        ...options,
      }
    );

    worker.on("completed", (job) => {
      console.log(`[${this.queue.name}] ${job.name}#${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[${this.queue.name}] ${job?.name}#${job?.id} failed:`, err.message);
    });

    console.log(`Worker created: ${this.queue.name}`);
    return worker;
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
