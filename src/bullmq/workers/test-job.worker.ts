import { queue } from "../queues";
import type { AppJobRegistry } from "../jobs";
import type { ProcessorFor } from "../registry";
import { db } from "@/db/drizzle";

/**
 * Test Job Processor
 * Example job that demonstrates the type-safe job pattern
 */

// Define the processor with clean type syntax
export const testJobProcessor: ProcessorFor<
  AppJobRegistry,
  "test-job"
> = async (job) => {
  const data = job.data; // Type: { message: string }

  console.log("Processing test job:", data);
  console.log("Message:", data.message);

  const user = await db.query.user.findMany();

  console.log("Current users in the database:", user.length);

  console.log("Job executed successfully");

  // This job returns void, so no return value needed
};

// Register the job processor
queue.registerJob("test-job", testJobProcessor);
