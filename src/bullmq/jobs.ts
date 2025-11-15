import { TypedQueue } from "./queue";

/**
 * Define all job types here for type safety
 *
 * Add new jobs: 'job-name': DataType
 */
export type AppJobs = {
  "test-job": { message: string };
  // Example: Add more jobs
  // "send-email": { to: string; subject: string; body: string };
  // "process-upload": { fileId: string; userId: string };
};

/**
 * Job progress data structure for real-time updates
 */
export type JobProgressData = {
  progress: number;
  message: string;
};

// Export typed queue instance
export const queue = new TypedQueue<AppJobs>("main");
