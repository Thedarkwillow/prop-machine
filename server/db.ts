import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pg;

export function createIPv4Pool(): pg.Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const url = new URL(process.env.DATABASE_URL);
  url.hostname = "postgres.railway.internal";

  return new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false }
  });
}

export const pool = createIPv4Pool();
export const db = drizzle(pool, { schema });
