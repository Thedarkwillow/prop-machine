import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import dns from "dns";

const { Pool } = pg;

// prefer explicit IPv4 URL if set
const DB_URL = process.env.DATABASE_URL_IPV4 ?? process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL or DATABASE_URL_IPV4 must be set");

export function createIPv4Pool(): pg.Pool {
  const url = new URL(DB_URL);

  const database = url.pathname.replace("/", "");
  const user = decodeURIComponent(url.username || "postgres");
  const password = decodeURIComponent(url.password || "");

  const hostname = process.env.DATABASE_HOST ?? "postgres.railway.internal";

  const lookup: pg.LookupFunction = (host, opts, cb) => {
    dns.lookup(host, { family: 4, all: false }, (err, addr) => {
      cb(err, addr, 4);
    });
  };

  return new Pool({
    host: hostname,
    user,
    password,
    port: Number(url.port) || 5432,
    database,
    ssl: { rejectUnauthorized: false },
    lookup,
  });
}

export const pool = createIPv4Pool();
export const db = drizzle(pool, { schema });
