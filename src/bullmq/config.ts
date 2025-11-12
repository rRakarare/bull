import * as os from "os";

/**
 * BullMQ Configuration
 * Centralized configuration for queue and worker options
 */

export interface BullMQConfig {
  // Worker Configuration
  concurrency: number;

  // Job Configuration
  defaultAttempts: number;
  defaultBackoff: {
    type: "exponential" | "fixed";
    delay: number;
  };

  // Cleanup Configuration
  removeOnComplete: { count: number } | boolean;
  removeOnFail: { count: number } | boolean;
}

/**
 * Calculate optimal concurrency based on system specs
 * Default: Number of CPU cores (leaves headroom for other processes)
 */
const getDefaultConcurrency = (): number => {
  const cpuCount = os.cpus().length;
  // Use CPU count as default, can be overridden
  return Math.max(1, cpuCount);
};

/**
 * Default BullMQ configuration
 * Can be overridden via environment variables or at runtime
 */
export const bullMQConfig: BullMQConfig = {
  concurrency: process.env.BULLMQ_CONCURRENCY
    ? parseInt(process.env.BULLMQ_CONCURRENCY, 10)
    : getDefaultConcurrency(),

  defaultAttempts: process.env.BULLMQ_DEFAULT_ATTEMPTS
    ? parseInt(process.env.BULLMQ_DEFAULT_ATTEMPTS, 10)
    : 3,

  defaultBackoff: {
    type: "exponential",
    delay: process.env.BULLMQ_BACKOFF_DELAY
      ? parseInt(process.env.BULLMQ_BACKOFF_DELAY, 10)
      : 3000,
  },

  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

/**
 * Get system information for monitoring/logging
 */
export const getSystemInfo = () => ({
  cpus: os.cpus().length,
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
  platform: os.platform(),
  arch: os.arch(),
});
