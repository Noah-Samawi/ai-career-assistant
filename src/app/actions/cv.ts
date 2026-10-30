"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { processCvUpload } from "@/lib/cv/service";
import { CvExtractError } from "@/lib/cv/extract";
import { audit } from "@/lib/audit";
import { canonicalSkill } from "@/lib/skills/dictionary";
import { splitList, uniq } from "@/lib/text";
import { getT } from "@/i18n";
import type { ActionState } from "@/lib/action-state";

export async function uploadCvAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const file = fd.get("cv");
  if (!(file instanceof File) || file.size === 0) return { error: t("cv.uploadHint") };
  try {
    const res = await processCvUpload(user, file, { asNewProfile: fd.get("asNew") === "on" });
    await audit(user.id, "cv.upload", { entityType: "profile", entityId: res.profileId, meta: { method: res.method } });
    revalidatePath("/", "layout");
    return { ok: true, message: res.warning ?? (res.method.startsWith("ai") ? t("cv.method.ai") : t("cv.method.heuristic")) };
  } catch (err) {
    if (err instanceof CvExtractError || (err instanceof Error && /File too large|Empty file/.test(err.message))) return { error: err.message };
    console.error("[cv.upload]", err);
    return { error: t("error.generic") };
  }
}

const profileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().max(200),
  email: z.string().trim().max(200),
  phone: z.string().trim().max(60),
  location: z.string().trim().max(200),
  headline: z.string().trim().max(200),
  summary: z.string().trim().max(3000),
  skills: z.string().max(5000),
  languages: z.string().max(2000),
  yearsExperience: z.string().max(3),
  experience: z.string().max(20000),
  education: z.string().max(5000),
});

/** Parses "Title | Company | Start | End | Description" lines (editor format). */
function parseExperience(src: string) {
  return src
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((l) => {
      const [title = "", company, start, end, description] = l.split("|").map((s) => s.trim());
      return { title, company: company || null, location: null, start: start || null, end: end && !/^(heute|today|now|present)$/i.test(end) ? end : null, description: description || null };
    })
    .filter((e) => e.title);
}

function parseEducation(src: string) {
  return src
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 15)
    .map((l) => {
      const [degree = "", institution, start, end] = l.split("|").map((s) => s.trim());
      return { degree, institution: institution || null, start: start || null, end: end || null };
    })
    .filter((e) => e.degree);
}

export async function saveProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: t("error.generic") };
  const d = parsed.data;
  const n = (s: string) => (s ? s : null);
  const years = d.yearsExperience ? Number.parseInt(d.yearsExperience, 10) : null;
  const res = await getDb()
    .update(schema.profiles)
    .set({
      fullName: n(d.fullName),
      email: n(d.email),
      phone: n(d.phone),
      location: n(d.location),
      headline: n(d.headline),
      summary: n(d.summary),
      skills: uniq(splitList(d.skills.replace(/\n/g, ",")).map(canonicalSkill)).slice(0, 80),
      languages: d.languages
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 15)
        .map((l) => {
          const [name = "", level] = l.split(/\s+[–-]\s+|:/).map((s) => s.trim());
          return { name, level: level || null };
        }),
      yearsExperience: years !== null && Number.isFinite(years) ? Math.min(Math.max(years, 0), 60) : null,
      experience: parseExperience(d.experience),
      education: parseEducation(d.education),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.profiles.id, d.id), eq(schema.profiles.userId, user.id)))
    .returning({ id: schema.profiles.id });
  if (!res[0]) return { error: t("error.generic") };
  await audit(user.id, "profile.update", { entityType: "profile", entityId: d.id });
  revalidatePath("/cv");
  return { ok: true, message: t("common.saved") };
}
