"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { runLoop } from "@/lib/agent/run-loop";
import { SOURCES } from "@/lib/jobs/registry";
import { consume, LimitExceededError, PLAN_LIMITS, type Plan } from "@/lib/plans";
import { audit } from "@/lib/audit";
import { splitList } from "@/lib/text";
import { getT } from "@/i18n";
import type { ActionState } from "@/lib/action-state";

const loopSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  profileId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  jobTitles: z.string().max(1000),
  locations: z.string().max(1000),
  countries: z.string().max(200),
  greenhouseBoards: z.string().max(1000),
  leverCompanies: z.string().max(1000),
  preferredCompanies: z.string().max(2000),
  excludedCompanies: z.string().max(2000),
  excludedKeywords: z.string().max(1000),
  minScore: z.coerce.number().int().min(0).max(100),
  dailyLimit: z.coerce.number().int().min(1).max(100),
  mode: z.enum(["approval", "auto_prepare"]),
  coverLetterLanguage: z.enum(["auto", "de", "en", "fr", "es", "ar"]),
});

export async function saveLoopAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const raw = Object.fromEntries(fd);
  const parsed = loopSchema.safeParse(raw);
  if (!parsed.success) return { error: `${t("error.generic")} (${parsed.error.issues[0]?.path.join(".")})` };
  const d = parsed.data;
  const jobTitles = splitList(d.jobTitles);
  if (!jobTitles.length) return { error: t("loops.titlesHint") };

  const db = getDb();
  const [profile] = await db.select().from(schema.profiles).where(and(eq(schema.profiles.id, d.profileId), eq(schema.profiles.userId, user.id)));
  if (!profile) return { error: t("loops.needProfile") };

  const validSources = new Set(SOURCES.map((s) => s.id));
  const values = {
    profileId: d.profileId,
    name: d.name,
    jobTitles,
    locations: splitList(d.locations),
    countries: splitList(d.countries.toLowerCase()).filter((c) => /^[a-z]{2}$/.test(c)),
    remoteOnly: fd.get("remoteOnly") === "on",
    includeRemote: fd.get("includeRemote") === "on",
    sources: fd.getAll("sources").map(String).filter((s) => validSources.has(s)),
    greenhouseBoards: splitList(d.greenhouseBoards.toLowerCase()),
    leverCompanies: splitList(d.leverCompanies.toLowerCase()),
    preferredCompanies: splitList(d.preferredCompanies),
    excludedCompanies: splitList(d.excludedCompanies),
    excludedKeywords: splitList(d.excludedKeywords),
    minScore: d.minScore,
    dailyLimit: d.dailyLimit,
    mode: d.mode,
    coverLetterLanguage: d.coverLetterLanguage,
  };

  let id = d.id || "";
  if (id) {
    const res = await db.update(schema.loops).set(values).where(and(eq(schema.loops.id, id), eq(schema.loops.userId, user.id))).returning({ id: schema.loops.id });
    if (!res[0]) return { error: t("error.generic") };
  } else {
    const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.loops).where(eq(schema.loops.userId, user.id));
    const max = PLAN_LIMITS[user.plan as Plan].loops;
    if (count >= max) return { error: t("error.limit", { limit: max }) };
    const [l] = await db.insert(schema.loops).values({ userId: user.id, ...values }).returning({ id: schema.loops.id });
    id = l!.id;
  }
  await audit(user.id, d.id ? "loop.update" : "loop.create", { entityType: "loop", entityId: id });
  revalidatePath("/loops");
  redirect(`/loops/${id}`);
}

async function ownedLoop(userId: string, id: string) {
  const [l] = await getDb().select().from(schema.loops).where(and(eq(schema.loops.id, id), eq(schema.loops.userId, userId)));
  if (!l) throw new Error("Loop not found");
  return l;
}

export async function runLoopNowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const loop = await ownedLoop(user.id, String(fd.get("id")));
  try {
    await consume(user.id, user.plan as Plan, "manual_run");
    const res = await runLoop(loop.id, { trigger: "manual" });
    revalidatePath("/", "layout");
    const failed = res.sourceResults.filter((s) => !s.ok).map((s) => s.source);
    const s = res.stats;
    if (res.sourceResults.length === 0) return { error: t("loops.sources") + ": –" };
    if (failed.length === res.sourceResults.length) return { error: t("run.allFailed", { sources: failed.join(", ") }) };
    const summary = t("run.summary", { fetched: s.fetched, fresh: s.newJobs, matched: s.matched, drafts: s.drafts });
    return { ok: true, message: failed.length ? `${summary} · ${t("run.sourcesFailed", { sources: failed.join(", ") })}` : summary };
  } catch (err) {
    if (err instanceof LimitExceededError) return { error: t("error.limit", { limit: err.limit }) };
    console.error("[loop.run]", err);
    return { error: t("error.generic") };
  }
}

export async function toggleLoopAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const loop = await ownedLoop(user.id, String(fd.get("id")));
  await getDb().update(schema.loops).set({ active: !loop.active }).where(eq(schema.loops.id, loop.id));
  revalidatePath("/loops");
  revalidatePath(`/loops/${loop.id}`);
}

export async function deleteLoopAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const loop = await ownedLoop(user.id, String(fd.get("id")));
  await getDb().delete(schema.loops).where(eq(schema.loops.id, loop.id));
  await audit(user.id, "loop.delete", { entityType: "loop", entityId: loop.id });
  revalidatePath("/loops");
  redirect("/loops");
}
