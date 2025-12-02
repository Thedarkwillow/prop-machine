import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema"; // adjust if path differs

const { Pool } = pg;

/**
 * Railway IPv6 fix:
 * Force PostgreSQL DNS to resolve using IPv4 internal hostname
 */
export function createIPv4Pool(): pg.Pool {
  const databaseUrl = process.env.DATABASE_URL_IPV4 ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const url = new URL(databaseUrl);
  url.hostname = "postgres.railway.internal";

  return new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });
}

export const pool = createIPv4Pool();
export const db = drizzle(pool, { schema });
