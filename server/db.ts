import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import dns from "dns";

const { Pool } = pg;

// Centralized way to read DB URL
const DATABASE_URL = process.env.DATABASE_URL_IPV4 ?? process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL or DATABASE_URL_IPV4 must be set");
}

/**
 * Railway IPv6 fix:
 * Force PostgreSQL DNS resolution to IPv4-only by:
 * - Overriding the host to Railway's internal hostname
 * - Using a custom lookup() that ALWAYS returns IPv4 (family: 4)
 */
export function createIPv4Pool(): pg.Pool {
  const url = new URL(DATABASE_URL);

  // Force the Railway internal host, even if DATABASE_URL has something else
  const hostname = process.env.DATABASE_HOST ?? "postgres.railway.internal";

  const port = Number(url.port || 5432);
  const database = url.pathname.replace("/", "");
  const user = decodeURIComponent(url.username || "postgres");
  const password = decodeURIComponent(url.password || "");

  // Custom lookup that always resolves to IPv4
  const lookup: pg.LookupFunction = (
    host: string,
    options: any,
    callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
  ) => {
    const finalOptions = {
      ...options,
      family: 4,
      all: false,
    };

    // Use dns.lookup to force IPv4
    dns.lookup(host, finalOptions, (err, address, family) => {
      if (err) {
        console.error("[DB] IPv4 lookup failed for host:", host, err);
        callback(err, address as any, family as any);
        return;
      }
      // Uncomment for debugging:
      // console.log("[DB] IPv4 lookup result:", { host, address, family });
      callback(null, address, family);
    });
  };

  const pool = new Pool({
    host: hostname,
    port,
    database,
    user,
    password,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    // Force IPv4 via custom lookup
    lookup,
    // Optional: tune as needed
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    console.error("[DB] Unexpected error on idle client", err);
  });

  return pool;
}

// Global shared pool for Drizzle + storage
export const pool = createIPv4Pool();

// Drizzle DB handle
export const db = drizzle(pool, { schema });
