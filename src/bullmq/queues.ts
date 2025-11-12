import { queueRegistry } from "./registry";
import type { AppJobRegistry } from "./jobs";

/**
 * Main application queue
 * All jobs are added to this single queue with type safety
 *
 * Usage:
 * ```typescript
 * import { queue } from "@/bullmq";
 *
 * // Add a job with full type safety and autocomplete
 * await queue.add('test-job', {
 *   message: 'Hello World'
 * });
 * ```
 */
export const queue = queueRegistry.getQueue<AppJobRegistry>("main");
