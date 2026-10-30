import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { User } from "@/db/schema";
import { sha256Hex } from "@/lib/crypto";
import { putEncrypted, removeObject } from "@/lib/storage";
import { activeProvider } from "@/lib/ai";
import { canonicalSkill } from "@/lib/skills/dictionary";
import { uniq } from "@/lib/text";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { extractText, MAX_CV_BYTES } from "./extract";
import { heuristicParse } from "./heuristic";
import { aiParse } from "./ai-parse";
import type { ParsedProfile } from "./types";

export type UploadResult = { profileId: string; method: string; warning?: string };

export async function processCvUpload(user: Pick<User, "id" | "plan">, file: File, opts: { asNewProfile?: boolean } = {}): Promise<UploadResult> {
  if (file.size === 0) throw new Error("Empty file");
  if (file.size > MAX_CV_BYTES) throw new Error("File too large (max. 5 MB)");
  const buf = Buffer.from(await file.arrayBuffer());
  const { text, kind } = await extractText(buf); // validates real file type

  const db = getDb();
  const storageKey = await putEncrypted(`cv/${user.id}`, buf);
  const [doc] = await db
    .insert(schema.cvDocuments)
    .values({
      userId: user.id,
      fileName: file.name.slice(0, 200).replace(/[^\p{L}\p{N}._ -]/gu, "_"),
      mimeType: kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: buf.length,
      storageKey,
      sha256: sha256Hex(buf),
      extractedText: text,
    })
    .returning();

  let parsed: ParsedProfile;
  let method = "heuristic";
  let warning: string | undefined;
  if (activeProvider()) {
    try {
      const r = await aiParse(text);
      parsed = r.profile;
      method = `ai:${r.provider}`;
    } catch (err) {
      parsed = heuristicParse(text);
      warning = `AI analysis failed (${err instanceof Error ? err.message.slice(0, 120) : "error"}) – basic analysis used.`;
    }
  } else {
    parsed = heuristicParse(text);
  }
  await db.update(schema.cvDocuments).set({ parseStatus: "parsed", parseMethod: method, parseError: warning ?? null }).where(eq(schema.cvDocuments.id, doc!.id));

  const values = {
    cvDocumentId: doc!.id,
    fullName: parsed.fullName,
    email: parsed.email,
    phone: parsed.phone,
    location: parsed.location,
    headline: parsed.headline,
    summary: parsed.summary,
    skills: uniq(parsed.skills.map(canonicalSkill)).slice(0, 80),
    languages: parsed.languages,
    experience: parsed.experience,
    education: parsed.education,
    certifications: parsed.certifications,
    yearsExperience: parsed.yearsExperience,
    suggestedCategories: parsed.suggestedCategories,
    missingQualifications: parsed.missingQualifications,
    updatedAt: new Date(),
  };

  const existing = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
  const primary = existing.find((p) => p.isPrimary) ?? existing[0];
  const maxProfiles = PLAN_LIMITS[user.plan as Plan].profiles;

  if (!primary || (opts.asNewProfile && existing.length < maxProfiles)) {
    const [p] = await db
      .insert(schema.profiles)
      .values({ userId: user.id, isPrimary: !primary, label: primary ? `Profil ${existing.length + 1}` : "Hauptprofil", ...values })
      .returning();
    return { profileId: p!.id, method, warning };
  }

  // Replace the primary profile's data; on plans with a single CV, drop the previous file.
  const oldDocId = primary.cvDocumentId;
  await db.update(schema.profiles).set(values).where(eq(schema.profiles.id, primary.id));
  if (maxProfiles === 1 && oldDocId && oldDocId !== doc!.id) {
    const [old] = await db.select().from(schema.cvDocuments).where(and(eq(schema.cvDocuments.id, oldDocId), eq(schema.cvDocuments.userId, user.id)));
    if (old) {
      await removeObject(old.storageKey);
      await db.delete(schema.cvDocuments).where(eq(schema.cvDocuments.id, old.id));
    }
  }
  return { profileId: primary.id, method, warning };
}
