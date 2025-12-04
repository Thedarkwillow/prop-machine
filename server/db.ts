import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pg;

export function createIPv4Pool(): pg.Pool {
  const url = process.env.DATABASE_URL_IPV4;

  if (!url) {
    throw new Error("DATABASE_URL_IPV4 must be set for IPv4 session and DB pool.");
  }

  return new Pool({
    connectionString: url,
    ssl: {
      rejectUnauthorized: false,
    },
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });
}

export const pool = createIPv4Pool();
export const db = drizzle(pool, { schema });
