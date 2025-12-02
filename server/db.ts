import pg from "pg";
import dns from "dns";
import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";
import path from "path";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Load environment variables before checking
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Sanitize DATABASE_URL
let databaseUrl = process.env.DATABASE_URL.trim();
databaseUrl = databaseUrl.replace(/^(psql%20|psql\s+)/i, ""); // strip psql prefix
databaseUrl = databaseUrl.replace(/^['"]|['"]$/g, ""); // strip surrounding quotes

// Validate URL format
let parsedUrl: URL;
try {
  parsedUrl = new URL(databaseUrl);
  if (parsedUrl.protocol !== "postgresql:" && parsedUrl.protocol !== "postgres:") {
    throw new Error(
      `Invalid protocol: ${parsedUrl.protocol}. Expected postgresql:// or postgres://`,
    );
  }

  const sanitizedUrl = databaseUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`🔗 Database URL: ${sanitizedUrl}`);
} catch (error: any) {
  if (error instanceof TypeError && error.message.includes("Invalid URL")) {
    console.error(
      `❌ Invalid DATABASE_URL format. Received: ${databaseUrl.substring(0, 50)}...`,
    );
    console.error(`   Error: ${error.message}`);
    console.error(
      `\n   Expected format: postgresql://user:password@host:port/database?sslmode=require`,
    );
    console.error(`   Common issues:`);
    console.error(`   - URL has 'psql%20' or 'psql ' prefix (remove it)`);
    console.error(`   - URL is wrapped in quotes (remove quotes)`);
    console.error(`   - URL is missing protocol (must start with postgresql://)`);
    console.error(
      `   - Credentials expired (get fresh connection string from Neon/Railway dashboard)`,
    );
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
  throw error;
}

// On some hosts (like Railway), IPv6 to Supabase can be unreachable.
// Resolve the DB hostname to an IPv4 address once at startup and
// rewrite the URL to use that IPv4 literal so pg never attempts IPv6.
if (parsedUrl.hostname && !parsedUrl.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
  const originalHost = parsedUrl.hostname;
  try {
    const ipv4 = await new Promise<string>((resolve, reject) => {
      dns.lookup(originalHost, { family: 4 }, (err, address) => {
        if (err || !address) return reject(err);
        resolve(address);
      });
    });

    parsedUrl.hostname = ipv4;
    databaseUrl = parsedUrl.toString();

    const masked = databaseUrl.replace(/:([^:@]+)@/, ":****@");
    console.log(
      `🌐 Using IPv4 DB host ${ipv4} instead of ${originalHost} to avoid IPv6 ENETUNREACH`,
    );
    console.log(`🔗 IPv4 Database URL: ${masked}`);
  } catch (err) {
    console.warn(
      `⚠️ Failed to resolve IPv4 for DB host '${originalHost}', continuing with hostname. Error: ${String(
        err,
      )}`,
    );
  }
}

// Create a standard pg Pool for Supabase
export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

// Initialize Drizzle using the node-postgres adapter
export const db = drizzle(pool, { schema });
