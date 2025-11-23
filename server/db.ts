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

// Configure Neon for Railway deployment (avoid WebSocket TLS issues)
if (process.env.NODE_ENV === "production") {
  // Use HTTP fetch instead of WebSockets in production (Railway)
  // This avoids TLS certificate issues with Railway
  neonConfig.fetchConnectionCache = true;
  neonConfig.poolQueryViaFetch = true;
  console.log("🔧 Using Neon HTTP fetch (production mode)");
} else {
  // Use WebSockets in development (Replit) for better performance
  neonConfig.webSocketConstructor = ws;
  console.log("🔧 Using Neon WebSockets (development mode)");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
