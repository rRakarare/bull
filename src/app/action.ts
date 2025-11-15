"use server";

import { queue } from "@/bullmq/jobs";

export const runBull = async () => {
  const job = await queue.add("test-job", { message: "Hello, BullMQ!" });
  return { jobId: job.id };
};
