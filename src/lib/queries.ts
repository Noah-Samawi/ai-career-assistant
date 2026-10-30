import { and, count, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { SENT_STATUSES } from "@/lib/applications/state";

export async function dashboardStats(userId: string) {
  const db = getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [[today], [matchesTotal], appCounts, [activeLoops], [profiles]] = await Promise.all([
    db.select({ n: count() }).from(schema.matches).where(and(eq(schema.matches.userId, userId), gte(schema.matches.createdAt, startOfDay))),
    db.select({ n: count() }).from(schema.matches).where(and(eq(schema.matches.userId, userId), ne(schema.matches.status, "excluded"))),
    db
      .select({ status: schema.applications.status, n: count() })
      .from(schema.applications)
      .where(eq(schema.applications.userId, userId))
      .groupBy(schema.applications.status),
    db.select({ n: count() }).from(schema.loops).where(and(eq(schema.loops.userId, userId), eq(schema.loops.active, true))),
    db.select({ n: count() }).from(schema.profiles).where(eq(schema.profiles.userId, userId)),
  ]);
  const by = Object.fromEntries(appCounts.map((r) => [r.status, r.n])) as Record<string, number>;
  const sent = SENT_STATUSES.reduce((s, k) => s + (by[k] ?? 0), 0);
  const responses = (by.interview ?? 0) + (by.offer ?? 0) + (by.rejected ?? 0);
  return {
    jobsToday: today?.n ?? 0,
    matchesTotal: matchesTotal?.n ?? 0,
    pending: by.pending_approval ?? 0,
    sent,
    interviews: (by.interview ?? 0) + (by.offer ?? 0),
    rejections: by.rejected ?? 0,
    activeLoops: activeLoops?.n ?? 0,
    hasProfile: (profiles?.n ?? 0) > 0,
    responseRate: sent ? Math.round((responses / sent) * 100) : null,
  };
}

export async function listApplications(userId: string, opts: { statuses?: string[]; limit?: number } = {}) {
  const db = getDb();
  const where = opts.statuses?.length
    ? and(eq(schema.applications.userId, userId), inArray(schema.applications.status, opts.statuses as (typeof schema.applications.$inferSelect.status)[]))
    : eq(schema.applications.userId, userId);
  return db
    .select({
      id: schema.applications.id,
      status: schema.applications.status,
      createdAt: schema.applications.createdAt,
      appliedAt: schema.applications.appliedAt,
      updatedAt: schema.applications.updatedAt,
      title: schema.jobs.title,
      company: schema.jobs.company,
      location: schema.jobs.location,
      remote: schema.jobs.remote,
      source: schema.jobs.source,
      score: schema.matches.score,
    })
    .from(schema.applications)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .leftJoin(schema.matches, eq(schema.matches.id, schema.applications.matchId))
    .where(where)
    .orderBy(desc(schema.applications.updatedAt))
    .limit(opts.limit ?? 200);
}

export async function recentRuns(userId: string, limit = 8, loopId?: string) {
  return getDb()
    .select({
      id: schema.agentRuns.id,
      status: schema.agentRuns.status,
      trigger: schema.agentRuns.trigger,
      stats: schema.agentRuns.stats,
      sourceResults: schema.agentRuns.sourceResults,
      error: schema.agentRuns.error,
      startedAt: schema.agentRuns.startedAt,
      loopName: schema.loops.name,
      loopId: schema.loops.id,
    })
    .from(schema.agentRuns)
    .leftJoin(schema.loops, eq(schema.loops.id, schema.agentRuns.loopId))
    .where(loopId ? and(eq(schema.agentRuns.userId, userId), eq(schema.agentRuns.loopId, loopId)) : eq(schema.agentRuns.userId, userId))
    .orderBy(desc(schema.agentRuns.startedAt))
    .limit(limit);
}

export async function listMatches(userId: string, opts: { loopId?: string; minScore?: number; status?: string; limit?: number } = {}) {
  const conds = [eq(schema.matches.userId, userId)];
  if (opts.loopId) conds.push(eq(schema.matches.loopId, opts.loopId));
  if (opts.minScore) conds.push(gte(schema.matches.score, opts.minScore));
  if (opts.status) conds.push(eq(schema.matches.status, opts.status as "new"));
  return getDb()
    .select({ match: schema.matches, job: schema.jobs, applicationId: schema.applications.id })
    .from(schema.matches)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.matches.jobId))
    .leftJoin(schema.applications, and(eq(schema.applications.jobId, schema.matches.jobId), eq(schema.applications.userId, userId)))
    .where(and(...conds))
    .orderBy(sql`${schema.matches.status} = 'new' desc`, desc(schema.matches.score), desc(schema.matches.createdAt))
    .limit(opts.limit ?? 100);
}
