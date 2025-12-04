import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

export function createIPv4Pool() {
  const url = process.env.DATABASE_URL_IPV4;

  if (!url) {
    throw new Error("DATABASE_URL_IPV4 must be set");
  }

  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
}

export const pool = createIPv4Pool();
export const db = drizzle(pool);
