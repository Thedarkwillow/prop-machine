import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pg;

/**
 * Railway IPv6 fix:
 * Force PostgreSQL DNS to resolve using IPv4 internal hostname.
 * NO family:4 hacks. NO dns.lookup. NO parsing. Just override hostname.
 */
export function createIPv4Pool(): pg.Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  // Always replace hostname with Railway internal IPv4 only DNS
  const url = new URL(process.env.DATABASE_URL);
  url.hostname = "postgres.railway.internal";

  return new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });
}

export const pool = createIPv4Pool();
export const db = drizzle(pool, { schema });
