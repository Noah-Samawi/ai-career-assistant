import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { runLoop } from "./run-loop";

/** Runs all active loops of users whose plan includes scheduled runs. Sequential to respect source rate limits. */
export async function runScheduledLoops(log: (m: string) => void = console.log) {
  const rows = await getDb()
    .select({ id: schema.loops.id, name: schema.loops.name })
    .from(schema.loops)
    .innerJoin(schema.users, eq(schema.users.id, schema.loops.userId))
    .where(and(eq(schema.loops.active, true), inArray(schema.users.plan, ["pro", "premium"])));
  let ok = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      const res = await runLoop(r.id, { trigger: "schedule" });
      ok++;
      log(`[scheduler] ${r.name}: ${JSON.stringify(res.stats)}`);
    } catch (err) {
      failed++;
      log(`[scheduler] ${r.name} failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  return { total: rows.length, ok, failed };
}
