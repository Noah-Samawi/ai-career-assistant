import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { RunStats } from "@/db/schema";
import { getSource } from "@/lib/jobs/registry";
import type { JobSource, NormalizedJob } from "@/lib/jobs/types";
import { upsertJobs } from "@/lib/jobs/store";
import { scoreJob } from "@/lib/matching/score";
import { createDraft } from "@/lib/applications/service";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { notify } from "@/lib/notify";

export type RunOptions = {
  trigger: "manual" | "schedule";
  /** Override sources (tests). Production uses the loop's configured source ids. */
  sources?: JobSource[];
  fetchImpl?: typeof fetch;
};

export type RunResult = { runId: string; stats: RunStats; sourceResults: { source: string; ok: boolean; count: number; error?: string }[] };

/**
 * One agent cycle for a loop: search → store → dedupe → score → (optionally) prepare drafts → notify.
 * Never sends anything externally – drafts always wait for user approval.
 */
export async function runLoop(loopId: string, opts: RunOptions): Promise<RunResult> {
  const db = getDb();
  const [row] = await db
    .select({ loop: schema.loops, profile: schema.profiles, user: schema.users })
    .from(schema.loops)
    .innerJoin(schema.profiles, eq(schema.profiles.id, schema.loops.profileId))
    .innerJoin(schema.users, eq(schema.users.id, schema.loops.userId))
    .where(eq(schema.loops.id, loopId));
  if (!row) throw new Error("Loop not found");
  const { loop, profile, user } = row;

  const [run] = await db.insert(schema.agentRuns).values({ userId: user.id, loopId, trigger: opts.trigger }).returning();
  const stats: RunStats = { fetched: 0, newJobs: 0, scored: 0, matched: 0, excluded: 0, drafts: 0, skippedByLimit: 0 };
  const sourceResults: RunResult["sourceResults"] = [];

  try {
    // 1) Search all sources in parallel; one failing source never aborts the run.
    const sources = opts.sources ?? loop.sources.map(getSource).filter((s): s is JobSource => !!s && s.status() === "active");
    const query = {
      keywords: loop.jobTitles,
      locations: loop.locations,
      countries: loop.countries,
      remoteOnly: loop.remoteOnly,
      includeRemote: loop.includeRemote,
      greenhouseBoards: loop.greenhouseBoards,
      leverCompanies: loop.leverCompanies,
      limit: 50,
    };
    const settled = await Promise.allSettled(sources.map((s) => s.search(query, opts.fetchImpl)));
    const found: NormalizedJob[] = [];
    settled.forEach((r, i) => {
      const id = sources[i]!.id;
      if (r.status === "fulfilled") {
        found.push(...r.value);
        sourceResults.push({ source: id, ok: true, count: r.value.length });
      } else {
        sourceResults.push({ source: id, ok: false, count: 0, error: String(r.reason?.message ?? r.reason).slice(0, 300) });
      }
    });
    stats.fetched = found.length;

    // 2) Store, then drop jobs this user already has a match for (same job or same posting on another source).
    const stored = await upsertJobs(found);
    const byHash = new Map<string, (typeof stored)[number]>();
    for (const j of stored) if (!byHash.has(j.dedupeHash)) byHash.set(j.dedupeHash, j);
    const hashes = [...byHash.keys()];
    const known = hashes.length
      ? await db
          .select({ hash: schema.jobs.dedupeHash })
          .from(schema.matches)
          .innerJoin(schema.jobs, eq(schema.jobs.id, schema.matches.jobId))
          .where(and(eq(schema.matches.userId, user.id), inArray(schema.jobs.dedupeHash, hashes)))
      : [];
    const knownSet = new Set(known.map((k) => k.hash));
    const fresh = [...byHash.values()].filter((j) => !knownSet.has(j.dedupeHash));
    stats.newJobs = fresh.length;

    // 3) Score.
    const matchProfile = {
      skills: profile.skills,
      languages: profile.languages,
      yearsExperience: profile.yearsExperience,
      experienceTitles: profile.experience.map((e) => e.title),
      headline: profile.headline,
    };
    const scored = fresh.map((job) => ({ job, ...scoreJob(job, matchProfile, loop) }));
    stats.scored = scored.length;

    const inserted = scored.length
      ? await db
          .insert(schema.matches)
          .values(
            scored.map((s) => ({
              userId: user.id,
              loopId: loop.id,
              profileId: profile.id,
              jobId: s.job.id,
              score: s.score,
              breakdown: s.breakdown,
              status: s.excluded ? ("excluded" as const) : ("new" as const),
              exclusionReason: s.excluded,
            })),
          )
          .onConflictDoNothing({ target: [schema.matches.userId, schema.matches.jobId] })
          .returning()
      : [];
    stats.excluded = inserted.filter((m) => m.status === "excluded").length;
    const qualified = inserted.filter((m) => m.status === "new" && m.score >= loop.minScore).sort((a, b) => b.score - a.score);
    stats.matched = qualified.length;

    // 4) Prepare drafts (auto_prepare mode) within loop + plan daily limits.
    if (loop.mode === "auto_prepare" && qualified.length) {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const [{ count: today } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.applications)
        .where(and(eq(schema.applications.userId, user.id), gte(schema.applications.createdAt, startOfDay)));
      const budget = Math.max(0, Math.min(loop.dailyLimit, PLAN_LIMITS[user.plan as Plan].draftsPerDay) - today);
      for (const m of qualified.slice(0, budget)) {
        const { created } = await createDraft(user, {
          jobId: m.jobId,
          matchId: m.id,
          profile,
          language: loop.coverLetterLanguage,
          withLetter: true,
          actor: "agent",
        });
        if (created) stats.drafts++;
      }
      stats.skippedByLimit = Math.max(0, qualified.length - budget);
    }

    const failed = sourceResults.filter((s) => !s.ok).length;
    const status = failed === 0 ? "succeeded" : failed === sourceResults.length && sourceResults.length > 0 ? "failed" : "partial";
    await db.update(schema.agentRuns).set({ status, stats, sourceResults, finishedAt: new Date() }).where(eq(schema.agentRuns.id, run!.id));
    await db.update(schema.loops).set({ lastRunAt: new Date() }).where(eq(schema.loops.id, loop.id));

    if (stats.matched > 0) {
      await notify(user.id, {
        type: stats.drafts ? "drafts_ready" : "new_matches",
        title: stats.drafts ? `${stats.drafts} Bewerbungsentwürfe warten auf Freigabe` : `${stats.matched} neue passende Stellen`,
        body: `Loop „${loop.name}“: ${stats.newJobs} neue Stellen geprüft, ${stats.matched} ≥ ${loop.minScore} %.`,
        link: stats.drafts ? "/applications?status=pending_approval" : `/loops/${loop.id}`,
      });
    }
    return { runId: run!.id, stats, sourceResults };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.agentRuns)
      .set({ status: "failed", stats, sourceResults, error: message.slice(0, 1000), finishedAt: new Date() })
      .where(eq(schema.agentRuns.id, run!.id));
    throw err;
  }
}
