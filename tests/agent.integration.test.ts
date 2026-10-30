import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq, sql } from "drizzle-orm";
import { getDb, getPool, schema } from "@/db";
import { runLoop } from "@/lib/agent/run-loop";
import { transition, markSubmitted } from "@/lib/applications/service";
import type { JobSource, NormalizedJob } from "@/lib/jobs/types";

// Test-only source. Production never uses stub data (see registry.ts).
function stubSource(jobs: NormalizedJob[], id = "stub"): JobSource {
  return { id, label: id, statusHint: "", status: () => "active", search: async () => jobs };
}
const base: Omit<NormalizedJob, "externalId" | "title" | "company"> = {
  source: "stub", location: "Frankfurt am Main", country: "de", remote: false,
  description: "Wir suchen Verstärkung mit TypeScript, React, Node.js, PostgreSQL und Docker für unser Team. Wir bieten Ihnen eine spannende Aufgabe und die Kenntnisse in Deutsch sind wichtig.",
  url: "https://example.com/job", applyUrl: "https://example.com/apply", applyEmail: null, salaryMin: null, salaryMax: null,
  salaryCurrency: null, employmentType: null, tags: [], postedAt: new Date(),
};

let userId = "";
let loopId = "";

beforeAll(async () => {
  const db = getDb();
  await db.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  const [u] = await db.insert(schema.users).values({ email: "t@example.com", passwordHash: "x", plan: "pro" }).returning();
  userId = u!.id;
  const [p] = await db.insert(schema.profiles).values({
    userId, skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"], yearsExperience: 5,
    languages: [{ name: "German", level: "C2" }], experience: [{ title: "Full-Stack Developer", company: "X", location: null, start: "2021", end: null, description: null }],
  }).returning();
  const [l] = await db.insert(schema.loops).values({
    userId, profileId: p!.id, name: "Dev FFM", jobTitles: ["Full Stack Developer"], locations: ["Frankfurt"], countries: ["de"],
    excludedCompanies: ["BadCo"], minScore: 60, dailyLimit: 2, mode: "auto_prepare", sources: ["stub"],
  }).returning();
  loopId = l!.id;
});

afterAll(async () => {
  await getPool().end();
});

describe("agent runLoop (real Postgres)", () => {
  it("stores, scores, excludes, prepares drafts within the daily limit and notifies", async () => {
    const jobs: NormalizedJob[] = [
      { ...base, externalId: "1", title: "Full Stack Developer (m/w/d)", company: "Alpha GmbH" },
      { ...base, externalId: "2", title: "Full Stack Developer", company: "Beta AG" },
      { ...base, externalId: "3", title: "Full Stack Developer", company: "Gamma SE" },
      { ...base, externalId: "4", title: "Full Stack Developer", company: "BadCo" },
      { ...base, externalId: "5", title: "Lagerhelfer", company: "Delta", description: "Kommissionierung im Lager, Staplerschein erforderlich und wir bieten Ihnen faire Bezahlung" },
    ];
    const res = await runLoop(loopId, { trigger: "manual", sources: [stubSource(jobs)] });
    expect(res.stats).toMatchObject({ fetched: 5, newJobs: 5, scored: 5, excluded: 1, matched: 3, drafts: 2, skippedByLimit: 1 });

    const apps = await getDb().select().from(schema.applications).where(eq(schema.applications.userId, userId));
    expect(apps).toHaveLength(2);
    expect(apps.every((a) => a.status === "pending_approval")).toBe(true);
    expect(apps.every((a) => a.coverLetter === null)).toBe(true); // no AI key in tests → no letter is faked

    const notes = await getDb().select().from(schema.notifications).where(eq(schema.notifications.userId, userId));
    expect(notes[0]?.type).toBe("drafts_ready");
    const [run] = await getDb().select().from(schema.agentRuns).where(eq(schema.agentRuns.id, res.runId));
    expect(run?.status).toBe("succeeded");
  });

  it("does not re-match the same posting from another source (cross-source dedupe)", async () => {
    const dup = { ...base, source: "stub2", externalId: "x", title: "Full Stack Developer", company: "Alpha", location: "60311 Frankfurt am Main, Hessen" };
    const res = await runLoop(loopId, { trigger: "manual", sources: [stubSource([dup], "stub2")] });
    expect(res.stats.fetched).toBe(1);
    expect(res.stats.newJobs).toBe(0);
  });

  it("records failing sources without aborting the run", async () => {
    const broken: JobSource = { id: "broken", label: "b", statusHint: "", status: () => "active", search: async () => { throw new Error("HTTP 500"); } };
    const ok = stubSource([{ ...base, externalId: "9", title: "Full Stack Developer", company: "Omega" }], "ok");
    const res = await runLoop(loopId, { trigger: "manual", sources: [broken, ok] });
    expect(res.sourceResults.find((s) => s.source === "broken")).toMatchObject({ ok: false });
    const [run] = await getDb().select().from(schema.agentRuns).where(eq(schema.agentRuns.id, res.runId));
    expect(run?.status).toBe("partial");
  });

  it("enforces the approval workflow and honest 'submitted' status", async () => {
    const [app] = await getDb().select().from(schema.applications).where(eq(schema.applications.userId, userId)).limit(1);
    await expect(transition(userId, app!.id, "applied_externally", "user")).rejects.toThrow(/not allowed/);
    await expect(transition(userId, app!.id, "submitted", "user")).rejects.toThrow(/confirmation/);
    await transition(userId, app!.id, "approved", "user");
    await expect(markSubmitted(userId, app!.id, { channel: "email", reference: "", confirmedAt: new Date().toISOString() })).rejects.toThrow();
    const done = await transition(userId, app!.id, "applied_externally", "user");
    expect(done.appliedAt).not.toBeNull();
    const events = await getDb().select().from(schema.applicationEvents).where(eq(schema.applicationEvents.applicationId, app!.id));
    expect(events.map((e) => e.toStatus)).toEqual(expect.arrayContaining(["pending_approval", "approved", "applied_externally"]));
  });

  it("blocks access to other users' applications", async () => {
    const [app] = await getDb().select().from(schema.applications).limit(1);
    await expect(transition("00000000-0000-0000-0000-000000000000", app!.id, "withdrawn", "user")).rejects.toThrow(/not found/);
  });
});
