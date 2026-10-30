"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { ApplicationStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { createDraft, getOwnedApplication, regenerateLetter, saveLetter, transition } from "@/lib/applications/service";
import { LimitExceededError } from "@/lib/plans";
import { AiUnavailableError } from "@/lib/ai";
import { audit } from "@/lib/audit";
import { getT } from "@/i18n";
import type { ActionState } from "@/lib/action-state";

export async function draftFromMatchAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const matchId = String(fd.get("matchId"));
  const db = getDb();
  const [m] = await db.select().from(schema.matches).where(and(eq(schema.matches.id, matchId), eq(schema.matches.userId, user.id)));
  if (!m) throw new Error("Match not found");
  const [profile] = m.profileId
    ? await db.select().from(schema.profiles).where(and(eq(schema.profiles.id, m.profileId), eq(schema.profiles.userId, user.id)))
    : await db.select().from(schema.profiles).where(and(eq(schema.profiles.userId, user.id), eq(schema.profiles.isPrimary, true)));
  if (!profile) throw new Error("Profile not found");
  let language = "auto";
  if (m.loopId) {
    const [loop] = await db.select({ l: schema.loops.coverLetterLanguage }).from(schema.loops).where(eq(schema.loops.id, m.loopId));
    language = loop?.l ?? "auto";
  }
  const { application } = await createDraft(user, { jobId: m.jobId, matchId: m.id, profile, language, withLetter: true, actor: "user" });
  revalidatePath("/matches");
  redirect(`/applications/${application.id}`);
}

export async function dismissMatchAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  await getDb()
    .update(schema.matches)
    .set({ status: "dismissed" })
    .where(and(eq(schema.matches.id, String(fd.get("matchId"))), eq(schema.matches.userId, user.id)));
  revalidatePath("/matches");
}

export async function saveLetterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const id = String(fd.get("id"));
  const app = await getOwnedApplication(user.id, id);
  const [profile] = app.profileId ? await getDb().select().from(schema.profiles).where(eq(schema.profiles.id, app.profileId)) : [];
  try {
    await saveLetter(user.id, id, String(fd.get("coverLetter") ?? ""), profile?.skills ?? []);
  } catch (err) {
    return { error: err instanceof Error ? err.message : t("error.generic") };
  }
  revalidatePath(`/applications/${id}`);
  return { ok: true, message: t("common.saved") };
}

export async function generateLetterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const id = String(fd.get("id"));
  try {
    await regenerateLetter(user, id, String(fd.get("language") ?? "auto"));
  } catch (err) {
    if (err instanceof LimitExceededError) return { error: t("error.limit", { limit: err.limit }) };
    if (err instanceof AiUnavailableError) return { error: t("apps.noAi") };
    console.error("[letter.generate]", err);
    return { error: t("error.generic") };
  }
  revalidatePath(`/applications/${id}`);
  return { ok: true };
}

const USER_TARGETS: ApplicationStatus[] = ["approved", "pending_approval", "applied_externally", "interview", "offer", "rejected", "withdrawn", "draft"];

export async function setStatusAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const to = String(fd.get("to")) as ApplicationStatus;
  if (!USER_TARGETS.includes(to)) throw new Error("Invalid status");
  await transition(user.id, id, to, "user");
  await audit(user.id, "application.status", { entityType: "application", entityId: id, meta: { to } });
  revalidatePath("/", "layout");
}

export async function saveNotesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const id = String(fd.get("id"));
  await getDb()
    .update(schema.applications)
    .set({ notes: String(fd.get("notes") ?? "").slice(0, 5000), updatedAt: new Date() })
    .where(and(eq(schema.applications.id, id), eq(schema.applications.userId, user.id)));
  revalidatePath(`/applications/${id}`);
  return { ok: true, message: t("common.saved") };
}
