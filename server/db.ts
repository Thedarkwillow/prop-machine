import pg from "pg";
import dns from "dns";
import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";
import path from "path";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Load environment variables before checking
// Load .env from project root (where npm run dev is executed from)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Sanitize and validate DATABASE_URL
let databaseUrl = process.env.DATABASE_URL.trim();

// Remove common prefixes that might accidentally be included
// (e.g., "psql%20" or "psql " from copy-paste errors)
databaseUrl = databaseUrl.replace(/^(psql%20|psql\s+)/i, '');
databaseUrl = databaseUrl.replace(/^['"]|['"]$/g, ''); // Remove surrounding quotes

// Validate URL format
try {
  const url = new URL(databaseUrl);
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error(`Invalid protocol: ${url.protocol}. Expected postgresql:// or postgres://`);
  }
  
  // Log sanitized URL (without password) for debugging
  const sanitizedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔗 Database URL: ${sanitizedUrl}`);
} catch (error: any) {
  if (error instanceof TypeError && error.message.includes('Invalid URL')) {
    console.error(`❌ Invalid DATABASE_URL format. Received: ${databaseUrl.substring(0, 50)}...`);
    console.error(`   Error: ${error.message}`);
    console.error(`\n   Expected format: postgresql://user:password@host:port/database?sslmode=require`);
    console.error(`   Common issues:`);
    console.error(`   - URL has 'psql%20' or 'psql ' prefix (remove it)`);
    console.error(`   - URL is wrapped in quotes (remove quotes)`);
    console.error(`   - URL is missing protocol (must start with postgresql://)`);
    console.error(`   - Credentials expired (get fresh connection string from Neon/Railway dashboard)`);
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
  throw error;
}

// Create a standard pg Pool for Supabase
export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  // Force IPv4 to avoid ENETUNREACH errors to IPv6 addresses in some hosts.
  // Handle both (hostname, options, callback) and (hostname, callback) call shapes.
  lookup: (
    hostname: string,
    options: dns.LookupOneOptions | dns.LookupAllOptions | number | any,
    callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void,
  ) => {
    if (typeof options === "function") {
      // Called as lookup(host, callback)
      return dns.lookup(hostname, { family: 4 }, options as any);
    }

    // Called as lookup(host, options, callback)
    const opts =
      typeof options === "number"
        ? { family: 4 }
        : { ...(options || {}), family: 4 };

    return dns.lookup(hostname, opts as any, callback as any);
  },
});

// Initialize Drizzle using the node-postgres adapter
export const db = drizzle(pool, { schema });
