import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as appSchema from "./schema";
import * as authSchema from "./auth-schema";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

const schema = {
  ...appSchema,
  ...authSchema,
};

export const db = drizzle(pool, { schema });

export * from "./schema";
export * from "./auth-schema";