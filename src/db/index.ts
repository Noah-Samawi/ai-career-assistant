import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "@/lib/env";

export type DB = NodePgDatabase<typeof schema>;

const g = globalThis as unknown as { __db?: DB; __pool?: Pool };

export function getPool(): Pool {
  if (!g.__pool) g.__pool = new Pool({ connectionString: env().DATABASE_URL, max: 10 });
  return g.__pool;
}

export function getDb(): DB {
  if (!g.__db) g.__db = drizzle(getPool(), { schema });
  return g.__db;
}

export { schema };
