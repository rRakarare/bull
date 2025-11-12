/**
 * BullMQ Main Entry Point
 * Export all queues, configuration, and utilities
 */

// Export configuration
export * from "./config";

// Export registry types and utilities (for advanced usage)
export * from "./registry";

// Export job type definitions
export * from "./jobs";

// Export the main queue for adding jobs
export * from "./queues";

/**
 * Note: Import './bullmq/workers' in your worker process to start processing jobs
 *
 * Usage in your application:
 * ```typescript
 * import { queue } from '@/bullmq';
 *
 * // Add a job with type safety
 * await queue.add('test-job', {
 *   message: 'Hello World'
 * });
 * ```
 */
