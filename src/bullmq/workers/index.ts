/**
 * Worker Registry
 * Import all job processors and create the worker
 * This file should be imported once when your application starts (e.g., in a server startup file)
 */

import { queue } from "../queues";
import { queueRegistry } from "../registry";

// Import all job processors to register them
export * from "./test-job.worker";

// Add more job processors as you create them:
// export * from "./email.worker";
// export * from "./upload.worker";
// export * from "./notification.worker";

/**
 * Create the worker that processes all registered jobs
 * The worker automatically routes jobs to the correct processor based on job name
 */
export const worker = queue.createWorker();

// Register the worker in the global registry for shutdown management
queueRegistry.registerWorker("main", worker);

/**
 * Usage:
 * In your main server file or worker process:
 * import './bullmq/workers'; // This registers all job processors and starts the worker
 */
