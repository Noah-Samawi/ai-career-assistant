import { complete } from "@/lib/ai";
import { detectLanguage } from "@/lib/text";
import type { Job, Profile } from "@/db/schema";
import { findUnsupportedSkills } from "./claims";

const LANG_LABEL: Record<string, string> = { de: "German", en: "English", fr: "French", es: "Spanish", ar: "Arabic" };

export function resolveLetterLanguage(pref: string, job: Pick<Job, "description" | "title">): string {
  if (pref && pref !== "auto") return pref;
  return detectLanguage(`${job.title}\n${job.description}`) ?? "en";
}

function profileFacts(p: Profile): string {
  const exp = p.experience
    .slice(0, 8)
    .map((e) => `- ${e.title}${e.company ? ` @ ${e.company}` : ""} (${e.start ?? "?"} – ${e.end ?? "today"})${e.description ? `: ${e.description}` : ""}`)
    .join("\n");
  const edu = p.education.map((e) => `- ${e.degree}${e.institution ? `, ${e.institution}` : ""}`).join("\n");
  return [
    `Name: ${p.fullName ?? "(unknown)"}`,
    p.headline && `Headline: ${p.headline}`,
    p.summary && `Summary: ${p.summary}`,
    p.yearsExperience !== null && `Years of experience: ${p.yearsExperience}`,
    `Skills: ${p.skills.join(", ") || "(none listed)"}`,
    `Languages: ${p.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", ") || "(none listed)"}`,
    exp && `Experience:\n${exp}`,
    edu && `Education:\n${edu}`,
    p.certifications.length ? `Certifications: ${p.certifications.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM = `You write cover letters for job applications on behalf of a candidate.
STRICT RULES:
1. Use ONLY facts from CANDIDATE FACTS. Never invent employers, years, degrees, certificates, numbers, achievements or skills.
2. If the job asks for something the candidate does not have, do not claim it. You may express willingness to learn it, briefly.
3. Connect 2-3 concrete, real points from the candidate's experience to the job's most important requirements.
4. Professional, specific, no clichés, no exaggeration. 180-280 words. No placeholders like [Company].
5. Output only the letter body: salutation, paragraphs, closing with the candidate's name. No subject line, no address block.
6. If no contact person is known, use the standard formal salutation of the target language (German: "Sehr geehrte Damen und Herren,").`;

export async function generateCoverLetter(profile: Profile, job: Job, language: string) {
  const user = `TARGET LANGUAGE: ${LANG_LABEL[language] ?? language}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? "n/a"}${job.remote ? " (remote)" : ""}
Description:
"""
${job.description.slice(0, 8000)}
"""

CANDIDATE FACTS:
"""
${profileFacts(profile)}
"""`;
  const { text, provider } = await complete({ system: SYSTEM, user, maxTokens: 1200, temperature: 0.4 });
  const letter = text.trim();
  return { letter, provider, warnings: findUnsupportedSkills(letter, profile.skills) };
}
