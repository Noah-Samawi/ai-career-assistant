import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Application, ApplicationStatus, Profile, SubmissionConfirmation, User } from "@/db/schema";
import { consume, type Plan } from "@/lib/plans";
import { activeProvider } from "@/lib/ai";
import { assertTransition } from "./state";
import { generateCoverLetter, resolveLetterLanguage } from "./cover-letter";
import { findUnsupportedSkills } from "./claims";

type Actor = "user" | "agent" | "system";

async function logEvent(applicationId: string, actor: Actor, type: string, from?: string | null, to?: string | null, payload?: Record<string, unknown>) {
  await getDb().insert(schema.applicationEvents).values({ applicationId, actor, type, fromStatus: from ?? null, toStatus: to ?? null, payload });
}

export async function getOwnedApplication(userId: string, id: string): Promise<Application> {
  const [app] = await getDb()
    .select()
    .from(schema.applications)
    .where(and(eq(schema.applications.id, id), eq(schema.applications.userId, userId)));
  if (!app) throw new Error("Application not found");
  return app;
}

/** Creates (or returns the existing) application for a job – the unique (user, job) index prevents duplicates. */
export async function createDraft(
  user: Pick<User, "id" | "plan">,
  input: { jobId: string; matchId?: string | null; profile: Profile; language?: string; withLetter: boolean; actor: Actor },
): Promise<{ application: Application; created: boolean; letterError?: string }> {
  const db = getDb();
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, input.jobId));
  if (!job) throw new Error("Job not found");

  const inserted = await db
    .insert(schema.applications)
    .values({
      userId: user.id,
      jobId: job.id,
      matchId: input.matchId ?? null,
      profileId: input.profile.id,
      status: "draft",
      channel: "external_link",
    })
    .onConflictDoNothing({ target: [schema.applications.userId, schema.applications.jobId] })
    .returning();

  if (!inserted[0]) {
    const [existing] = await db
      .select()
      .from(schema.applications)
      .where(and(eq(schema.applications.userId, user.id), eq(schema.applications.jobId, job.id)));
    return { application: existing!, created: false };
  }
  let app = inserted[0];
  await logEvent(app.id, input.actor, "created", null, "draft");
  if (input.matchId) await db.update(schema.matches).set({ status: "drafted" }).where(eq(schema.matches.id, input.matchId));

  let letterError: string | undefined;
  if (input.withLetter && activeProvider()) {
    try {
      app = await writeLetter(user, app, input.profile, input.language ?? "auto", input.actor);
    } catch (err) {
      letterError = err instanceof Error ? err.message : String(err);
    }
  }
  app = await transition(user.id, app.id, "pending_approval", input.actor);
  return { application: app, created: true, letterError };
}

async function writeLetter(user: Pick<User, "id" | "plan">, app: Application, profile: Profile, languagePref: string, actor: Actor): Promise<Application> {
  const db = getDb();
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, app.jobId));
  await consume(user.id, user.plan as Plan, "cover_letter");
  const language = resolveLetterLanguage(languagePref, job!);
  const { letter, provider, warnings } = await generateCoverLetter(profile, job!, language);
  const [updated] = await db
    .update(schema.applications)
    .set({ coverLetter: letter, coverLetterLanguage: language, coverLetterMethod: `ai:${provider}`, claimWarnings: warnings, updatedAt: new Date() })
    .where(eq(schema.applications.id, app.id))
    .returning();
  await logEvent(app.id, actor, "cover_letter_generated", null, null, { language, provider, warnings });
  return updated!;
}

export async function regenerateLetter(user: Pick<User, "id" | "plan">, applicationId: string, language: string): Promise<Application> {
  const app = await getOwnedApplication(user.id, applicationId);
  if (!["draft", "pending_approval"].includes(app.status)) throw new Error("Letter can only be changed before approval");
  const db = getDb();
  const [profile] = app.profileId
    ? await db.select().from(schema.profiles).where(eq(schema.profiles.id, app.profileId))
    : await db.select().from(schema.profiles).where(and(eq(schema.profiles.userId, user.id), eq(schema.profiles.isPrimary, true)));
  if (!profile) throw new Error("Profile not found");
  return writeLetter(user, app, profile, language, "user");
}

export async function saveLetter(userId: string, applicationId: string, letter: string, profileSkills: string[]): Promise<Application> {
  const app = await getOwnedApplication(userId, applicationId);
  if (!["draft", "pending_approval"].includes(app.status)) throw new Error("Letter can only be changed before approval");
  const [updated] = await getDb()
    .update(schema.applications)
    .set({ coverLetter: letter.slice(0, 10_000), claimWarnings: findUnsupportedSkills(letter, profileSkills), updatedAt: new Date() })
    .where(eq(schema.applications.id, app.id))
    .returning();
  await logEvent(app.id, "user", "cover_letter_edited");
  return updated!;
}

export async function transition(userId: string, applicationId: string, to: ApplicationStatus, actor: Actor, note?: string): Promise<Application> {
  if (to === "submitted") throw new Error("Use markSubmitted() with a channel confirmation");
  const app = await getOwnedApplication(userId, applicationId);
  assertTransition(app.status, to);
  const [updated] = await getDb()
    .update(schema.applications)
    .set({
      status: to,
      updatedAt: new Date(),
      ...(to === "applied_externally" ? { appliedAt: new Date() } : {}),
    })
    .where(and(eq(schema.applications.id, app.id), eq(schema.applications.status, app.status)))
    .returning();
  if (!updated) throw new Error("Application was changed concurrently – please reload");
  await logEvent(app.id, actor, "status_changed", app.status, to, note ? { note } : undefined);
  return updated;
}

/** Only callable by a sending channel that received a confirmation (Phase 3: Gmail message id / ATS id). */
export async function markSubmitted(userId: string, applicationId: string, confirmation: SubmissionConfirmation): Promise<Application> {
  const app = await getOwnedApplication(userId, applicationId);
  if (app.status !== "approved") throw new Error("Only approved applications can be submitted");
  if (!confirmation.reference) throw new Error("Submission requires a confirmation reference");
  const [updated] = await getDb()
    .update(schema.applications)
    .set({ status: "submitted", confirmation, channel: confirmation.channel, appliedAt: new Date(confirmation.confirmedAt), updatedAt: new Date() })
    .where(eq(schema.applications.id, app.id))
    .returning();
  await logEvent(app.id, "system", "submitted", "approved", "submitted", { reference: confirmation.reference });
  return updated!;
}
