import { env } from "@/env";
import { Redis } from "ioredis";

// Use environment variables for production
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
