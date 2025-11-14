/**
 * Worker setup - Import job processors and create worker
 * Run with: npm run worker
 */

import { queue } from "../jobs";

// Import all job processors to register them
import "./test-job.worker";

// Create worker that processes all registered jobs
export const worker = queue.createWorker();
