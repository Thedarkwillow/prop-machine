import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL_IPV4) {
  throw new Error("DATABASE_URL_IPV4 must be set. Ensure the database is provisioned.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_IPV4,
  },
});
