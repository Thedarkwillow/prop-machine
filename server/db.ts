import pg from "pg";
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

// Create a standard pg Pool pointing at the Supabase pooler (IPv4-only)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Log once when we successfully connect to the Supabase pooler
pool
  .connect()
  .then((client) => {
    console.log("Connected to Supabase pooler IPv4");
    client.release();
  })
  .catch((err) => {
    console.error("Failed to connect to Supabase pooler IPv4", err);
    throw err;
  });

// Initialize Drizzle using the node-postgres adapter
export const db = drizzle(pool, { schema });
