"use server";

import { queue } from "@/bullmq";

export const runBull = async () => {
  queue.add("test-job", { message: "Hello, BullMQ!" });
};
