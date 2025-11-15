import { queue } from "../jobs";
import { db } from "@/db/drizzle";

// Register test job processor - job type is auto-inferred!
queue.registerJob("test-job", async (job) => {
  console.log("Processing test job:", job.data);
  console.log("Message:", job.data.message);

  const totalSteps = 10;

  for (let i = 0; i <= totalSteps; i++) {
    const progress = Math.round((i / totalSteps) * 100);

    // Update progress with different status messages (JobProgressData type)
    if (i === 0) {
      await job.updateProgress({
        progress,
        message: "Initializing job...",
      });
    } else if (i <= 3) {
      await job.updateProgress({
        progress,
        message: "Querying data...",
      });
      // Simulate database query
      const users = await db.query.user.findMany();
      console.log(`Step ${i}: Found ${users.length} users`);
    } else if (i <= 7) {
      await job.updateProgress({
        progress,
        message: "Processing records...",
      });
      // Simulate processing work
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else if (i < totalSteps) {
      await job.updateProgress({
        progress,
        message: "Finalizing...",
      });
      await new Promise((resolve) => setTimeout(resolve, 800));
    } else {
      await job.updateProgress({
        progress: 100,
        message: "Completed!",
      });
    }

    console.log(`Progress: ${progress}%`);
  }

  console.log("Job executed successfully");
});
