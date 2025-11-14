"use server";

import { queue } from "@/bullmq/jobs";

export const runBull = async () => {
  await queue.add("test-job", { message: "Hello, BullMQ!" });
};
