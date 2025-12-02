import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import dotenv from "dotenv";
import path from "path";
import * as schema from "@shared/schema";

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

// Configure Neon for deployment
// NOTE: The HTTP fetch mode is only valid for Neon-hosted databases.
// For Supabase (hosts ending with .supabase.co), forcing HTTP fetch causes it
// to try hitting api.<host>, which does not exist and results in ENOTFOUND.
const dbHost = new URL(databaseUrl).hostname;
const isNeonHost = dbHost.endsWith(".neon.tech");

if (process.env.NODE_ENV === "production" && isNeonHost) {
  // Use HTTP fetch instead of WebSockets in production *only for Neon*
  neonConfig.fetchConnectionCache = true;
  neonConfig.poolQueryViaFetch = true;
  console.log("🔧 Using Neon HTTP fetch (production mode, Neon host detected)");
} else {
  // Use WebSockets for Supabase and all non-Neon hosts (and in development)
  neonConfig.webSocketConstructor = ws;
  console.log("🔧 Using Neon WebSockets (non-Neon or development mode)");
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
