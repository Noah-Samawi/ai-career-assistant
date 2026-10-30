import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Plan = "free" | "pro" | "premium";

export const PLAN_LIMITS = {
  free: { profiles: 1, loops: 1, manualRunsPerDay: 3, coverLettersPerMonth: 5, draftsPerDay: 5, scheduledRuns: false },
  pro: { profiles: 1, loops: 3, manualRunsPerDay: 10, coverLettersPerMonth: 100, draftsPerDay: 25, scheduledRuns: true },
  premium: { profiles: 5, loops: 10, manualRunsPerDay: 30, coverLettersPerMonth: 500, draftsPerDay: 100, scheduledRuns: true },
} as const satisfies Record<Plan, Record<string, number | boolean>>;

export type Metric = "manual_run" | "cover_letter" | "draft";

function periodFor(metric: Metric, now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return metric === "cover_letter" ? `${d.slice(0, 7)}-01` : d;
}

export function limitFor(plan: Plan, metric: Metric): number {
  const l = PLAN_LIMITS[plan];
  return metric === "manual_run" ? l.manualRunsPerDay : metric === "cover_letter" ? l.coverLettersPerMonth : l.draftsPerDay;
}

export async function getUsage(userId: string, metric: Metric): Promise<number> {
  const rows = await getDb()
    .select({ count: schema.usageCounters.count })
    .from(schema.usageCounters)
    .where(
      and(
        eq(schema.usageCounters.userId, userId),
        eq(schema.usageCounters.metric, metric),
        eq(schema.usageCounters.period, periodFor(metric)),
      ),
    );
  return rows[0]?.count ?? 0;
}

export class LimitExceededError extends Error {
  constructor(public metric: Metric, public limit: number) {
    super(`Plan limit reached for ${metric} (${limit})`);
  }
}

/** Atomically increments a counter if it stays within the plan limit. */
export async function consume(userId: string, plan: Plan, metric: Metric, amount = 1): Promise<void> {
  const limit = limitFor(plan, metric);
  if (amount > limit) throw new LimitExceededError(metric, limit);
  const period = periodFor(metric);
  const res = await getDb().execute<{ count: number }>(sql`
    INSERT INTO usage_counters (user_id, metric, period, count)
    VALUES (${userId}, ${metric}, ${period}, ${amount})
    ON CONFLICT (user_id, metric, period)
    DO UPDATE SET count = usage_counters.count + ${amount}
    WHERE usage_counters.count + ${amount} <= ${limit}
    RETURNING count
  `);
  if (res.rows.length === 0 || (res.rows[0] && res.rows[0].count > limit)) {
    throw new LimitExceededError(metric, limit);
  }
}
