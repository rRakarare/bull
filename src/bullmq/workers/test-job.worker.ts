import { queue } from "../jobs";
import { db } from "@/db/drizzle";

// Register test job processor - job type is auto-inferred!
queue.registerJob("test-job", async (job) => {
  console.log("Processing test job:", job.data);
  console.log("Message:", job.data.message);

  const users = await db.query.user.findMany();
  console.log("Current users in database:", users.length);

  console.log("Job executed successfully");
});
