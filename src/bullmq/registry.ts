import {
  Worker,
  Queue,
  type Job,
  type WorkerOptions,
  type Processor,
} from "bullmq";
import { redis } from "@/db/redis/config";
import { bullMQConfig } from "./config";

/**
 * Job definition with data and result types
 */
export interface JobDefinition<TData = unknown, TResult = unknown> {
  data: TData;
  result: TResult;
}

/**
 * Job processor function type - matches BullMQ's Processor type exactly
 */
export type JobProcessor<TData = unknown, TResult = unknown> = (
  job: Job<TData, TResult>
) => Promise<TResult>;

/**
 * Helper type to extract job data type from registry
 */
export type DataFor<
  TRegistry,
  K extends keyof TRegistry
> = TRegistry[K] extends JobDefinition<infer TData, any> ? TData : never;

/**
 * Helper type to extract job result type from registry
 */
export type ResultFor<
  TRegistry,
  K extends keyof TRegistry
> = TRegistry[K] extends JobDefinition<any, infer TResult> ? TResult : never;

/**
 * Helper type for defining job processors with clean syntax
 * Usage: ProcessorFor<AppJobRegistry, 'job-name'>
 */
export type ProcessorFor<TRegistry, K extends keyof TRegistry> = JobProcessor<
  DataFor<TRegistry, K>,
  ResultFor<TRegistry, K>
>;

/**
 * Type-safe queue wrapper that ensures data matches job type
 */
export class TypedQueue<TRegistry> {
  private queue: Queue;
  private processors: Map<string, JobProcessor<any, any>> = new Map();

  constructor(queueName: string) {
    this.queue = new Queue(queueName, {
      connection: redis,
      defaultJobOptions: {
        attempts: bullMQConfig.defaultAttempts,
        backoff: bullMQConfig.defaultBackoff,
      },
    });
  }

  /**
   * Register a job processor
   */
  registerJob<K extends keyof TRegistry & string>(
    jobName: K,
    processor: JobProcessor<any, any>
  ): void {
    if (this.processors.has(jobName)) {
      console.warn(`Job processor "${jobName}" is already registered`);
      return;
    }
    this.processors.set(jobName, processor);
    console.log(`Job processor registered: ${jobName}`);
  }

  /**
   * Add a job to the queue with type-safe data
   */
  async add<K extends keyof TRegistry & string>(
    jobName: K,
    data: any,
    options?: Parameters<Queue["add"]>[2]
  ): Promise<Job<any, any>> {
    return this.queue.add(jobName, data, options) as Promise<Job<any, any>>;
  }

  /**
   * Get the processor for a job
   */
  getProcessor(jobName: string): JobProcessor<any, any> | undefined {
    return this.processors.get(jobName);
  }

  /**
   * Get all registered job names
   */
  getRegisteredJobs(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Get the underlying BullMQ queue
   */
  getQueue(): Queue {
    return this.queue;
  }

  /**
   * Create a worker that processes all registered jobs
   */
  createWorker(options?: Partial<WorkerOptions>): Worker {
    // Main processor that routes to the correct job processor
    const mainProcessor: Processor<any, any, string> = async (job) => {
      const processor = this.processors.get(job.name);

      if (!processor) {
        throw new Error(
          `No processor registered for job "${
            job.name
          }". Available jobs: ${this.getRegisteredJobs().join(", ")}`
        );
      }

      return processor(job);
    };

    const worker = new Worker(this.queue.name, mainProcessor, {
      connection: redis,
      concurrency: bullMQConfig.concurrency,
      removeOnComplete: bullMQConfig.removeOnComplete as any,
      removeOnFail: bullMQConfig.removeOnFail as any,
      ...options,
    });

    // Setup event listeners for monitoring
    worker.on("completed", (job) => {
      console.log(`[${this.queue.name}] Job ${job.name}#${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(
        `[${this.queue.name}] Job ${job?.name}#${job?.id} failed:`,
        err.message
      );
    });

    console.log(`Worker created for queue: ${this.queue.name}`);
    return worker;
  }

  /**
   * Close the queue
   */
  async close(): Promise<void> {
    await this.queue.close();
  }
}

/**
 * Global registry for managing queues
 */
class QueueRegistry {
  private queues: Map<string, TypedQueue<any>> = new Map();
  private workers: Map<string, Worker> = new Map();

  /**
   * Get or create a typed queue
   */
  getQueue<TRegistry>(queueName: string): TypedQueue<TRegistry> {
    if (!this.queues.has(queueName)) {
      const queue = new TypedQueue<TRegistry>(queueName);
      this.queues.set(queueName, queue);
      console.log(`Queue created: ${queueName}`);
    }

    return this.queues.get(queueName) as TypedQueue<TRegistry>;
  }

  /**
   * Register a worker for a queue
   */
  registerWorker(queueName: string, worker: Worker): void {
    this.workers.set(queueName, worker);
  }

  /**
   * Get all queues
   */
  getAllQueues(): TypedQueue<any>[] {
    return Array.from(this.queues.values());
  }

  /**
   * Get all workers
   */
  getAllWorkers(): Worker[] {
    return Array.from(this.workers.values());
  }

  /**
   * Gracefully shutdown all workers and queues
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down all workers and queues...");

    const closePromises = [
      ...Array.from(this.workers.values()).map((worker) => worker.close()),
      ...Array.from(this.queues.values()).map((queue) => queue.close()),
    ];

    await Promise.all(closePromises);
    console.log("All workers and queues shut down successfully");
  }
}

// Export singleton instance
export const queueRegistry = new QueueRegistry();
