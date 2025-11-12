import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as user from "./user/schema";

import { env } from "@/env";

const pool = new Pool({
  connectionString: env.POSTGRES_URL,
});

const db = drizzle({
  client: pool,
  schema: {
    ...user,
  },
});

export { db };
