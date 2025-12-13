import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL_IPV4) {
  throw new Error("DATABASE_URL_IPV4 must be set. Ensure the database is provisioned.");
}

// Parse connection URL and ensure SSL is enabled
const dbUrl = new URL(process.env.DATABASE_URL_IPV4);
// Add sslmode=require if not already present
if (!dbUrl.searchParams.has("sslmode")) {
  dbUrl.searchParams.set("sslmode", "require");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl.toString(),
  },
});
