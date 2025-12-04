import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pg;

const url = new URL(process.env.DATABASE_URL_IPV4 ?? process.env.DATABASE_URL ?? "");
url.hostname = "postgres.railway.internal";

export function createIPv4Pool(): pg.Pool {
  const pool = new Pool({
    host: url.hostname,
    port: Number(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.replace("/", ""),
    ssl: { rejectUnauthorized: false },
    // @ts-expect-error family is forwarded to underlying socket options at runtime
    family: 4,
  } as any);

  console.log(
    "[DB] Connection source:",
    process.env.DATABASE_URL_IPV4 ? "DATABASE_URL_IPV4" : "DATABASE_URL"
  );

  return pool;
}

export const pool = createIPv4Pool();
export const db = drizzle(pool, { schema });
