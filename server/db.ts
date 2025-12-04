import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pg;

export function createIPv4Pool(): pg.Pool {
  const urlString = process.env.DATABASE_URL_IPV4;

  if (!urlString) {
    throw new Error("DATABASE_URL_IPV4 must be set for IPv4 session and DB pool.");
  }

  // Parse connection string to allow hostname override
  const url = new URL(urlString);
  
  // Allow overriding hostname via env var (useful for Railway internal networking)
  const hostname = process.env.DATABASE_HOST ?? url.hostname;
  const port = Number(url.port) || 5432;
  const database = url.pathname.replace("/", "");
  const user = decodeURIComponent(url.username || "postgres");
  const password = decodeURIComponent(url.password || "");

  console.log(`[DB] Connecting to ${hostname}:${port}/${database} (hostname ${process.env.DATABASE_HOST ? 'overridden' : 'from connection string'})`);

  return new Pool({
    host: hostname,
    port: port,
    database: database,
    user: user,
    password: password,
    ssl: {
      rejectUnauthorized: false,
    },
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });
}

export const pool = createIPv4Pool();
export const db = drizzle(pool, { schema });
