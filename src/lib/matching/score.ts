import type { ScoreBreakdown } from "@/db/schema";
import { aliasesFor, detectSkills } from "@/lib/skills/dictionary";
import { detectLanguage, normalize, tokens } from "@/lib/text";
import { normalizeCompany, normalizeTitle } from "@/lib/jobs/dedupe";

export type MatchProfile = {
  skills: string[];
  languages: { name: string; level: string | null }[];
  yearsExperience: number | null;
  experienceTitles: string[];
  headline: string | null;
};

export type MatchPrefs = {
  jobTitles: string[];
  locations: string[];
  countries: string[];
  remoteOnly: boolean;
  includeRemote: boolean;
  excludedCompanies: string[];
  excludedKeywords: string[];
  preferredCompanies: string[];
};

export type MatchJob = {
  title: string;
  company: string;
  location: string | null;
  country: string | null;
  remote: boolean;
  description: string;
  tags: string[];
};

export type MatchResult = { score: number; breakdown: ScoreBreakdown; excluded: string | null };

export const WEIGHTS = { skills: 45, title: 30, location: 15, language: 10 } as const;

const SENIOR = /\b(senior|sr|lead|principal|staff|head|director|leitung|leiter|architect|architekt)\b/;
const JUNIOR = /\b(junior|jr|entry|einsteiger|berufseinsteiger|graduate|trainee|werkstudent|praktikum|intern|internship|azubi|ausbildung)\b/;

const LANG_NAME: Record<string, string[]> = {
  de: ["german", "deutsch"],
  en: ["english", "englisch"],
  fr: ["french", "franzosisch", "francais"],
  es: ["spanish", "spanisch", "espanol"],
  ar: ["arabic", "arabisch"],
};

function hasSkill(hay: string, skill: string): boolean {
  return aliasesFor(skill).some((a) => {
    const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#])${esc}(?=$|[^a-z0-9+#])`).test(hay);
  });
}

/** Share of the best-matching desired title's tokens found in the job title (0..1). */
export function titleSimilarity(jobTitle: string, desired: string[]): number {
  const jt = new Set(tokens(normalizeTitle(jobTitle)));
  if (!jt.size || !desired.length) return 0;
  let best = 0;
  for (const d of desired) {
    const dt = tokens(d);
    if (!dt.length) continue;
    const hits = dt.filter((t) => jt.has(t) || [...jt].some((j) => j.length > 4 && (j.startsWith(t) || t.startsWith(j)))).length;
    best = Math.max(best, hits / dt.length);
  }
  return best;
}

export function scoreJob(job: MatchJob, profile: MatchProfile, prefs: MatchPrefs): MatchResult {
  const notes: string[] = [];
  const text = `${job.title}\n${job.tags.join(" ")}\n${job.description}`;
  const hay = normalize(text);
  const company = normalizeCompany(job.company);

  // --- Hard exclusions
  let excluded: string | null = null;
  const exComp = prefs.excludedCompanies.find((c) => {
    const n = normalizeCompany(c);
    return n.length > 1 && (company === n || company.includes(n));
  });
  if (exComp) excluded = `Firma ausgeschlossen: ${exComp}`;
  const exKw = prefs.excludedKeywords.find((k) => k.trim() && normalize(job.title).includes(normalize(k)));
  if (!excluded && exKw) excluded = `Ausschluss-Stichwort im Titel: ${exKw}`;
  if (!excluded && prefs.remoteOnly && !job.remote) excluded = "Nur Remote gewünscht";

  // --- Skills (45): coverage of the job's detected requirements; fallback = profile skills found in job
  const required = detectSkills(text, { strict: true });
  const matchedSkills = profile.skills.filter((s) => hasSkill(hay, s));
  const matchedCanon = new Set(matchedSkills.map((s) => aliasesFor(s)[0]));
  const missingSkills = required.filter((r) => !profile.skills.some((s) => aliasesFor(s)[0] === aliasesFor(r)[0]));
  let skillRatio: number;
  if (required.length >= 3) {
    skillRatio = (required.length - missingSkills.length) / required.length;
  } else {
    // Sparse descriptions (e.g. BA list results): judge by how many profile skills are mentioned at all.
    skillRatio = Math.min(1, matchedCanon.size / 3);
    if (job.description.length < 400) notes.push("Kurze Stellenbeschreibung – Skill-Abgleich eingeschränkt");
  }
  const skills = Math.round(WEIGHTS.skills * skillRatio);

  // --- Title (30): desired titles first, then titles from past experience
  const desired = [...prefs.jobTitles, ...(profile.headline ? [profile.headline] : [])];
  const tDesired = titleSimilarity(job.title, desired);
  const tPast = titleSimilarity(job.title, profile.experienceTitles) * 0.8;
  const title = Math.round(WEIGHTS.title * Math.max(tDesired, tPast));

  // --- Location (15)
  let location = 0;
  const jobLoc = normalize(`${job.location ?? ""} ${job.country ?? ""}`);
  if (job.remote && (prefs.includeRemote || prefs.remoteOnly)) location = WEIGHTS.location;
  else if (prefs.locations.some((l) => l.trim() && jobLoc.includes(normalize(l)))) location = WEIGHTS.location;
  else if (job.country && prefs.countries.includes(job.country)) location = Math.round(WEIGHTS.location * 0.6);
  else if (!prefs.locations.length && !prefs.countries.length) location = Math.round(WEIGHTS.location * 0.6);
  else if (!job.location) location = Math.round(WEIGHTS.location * 0.4);

  // --- Language (10): can the candidate work in the posting's language?
  let language = Math.round(WEIGHTS.language * 0.6);
  const lang = detectLanguage(job.description || job.title);
  if (lang) {
    const names = LANG_NAME[lang] ?? [];
    const has = profile.languages.some((l) => names.includes(normalize(l.name)));
    if (has) language = WEIGHTS.language;
    else if (profile.languages.length) {
      language = 0;
      notes.push(`Stellenanzeige ist auf ${lang.toUpperCase()} – Sprache nicht im Profil`);
    }
  }

  // --- Seniority penalty
  let seniorityPenalty = 0;
  const nt = normalize(job.title);
  const years = profile.yearsExperience;
  if (years !== null) {
    if (SENIOR.test(nt) && years < 4) {
      seniorityPenalty = years < 2 ? 15 : 8;
      notes.push("Senior-/Lead-Rolle bei wenig Berufserfahrung");
    } else if (JUNIOR.test(nt) && years >= 6) {
      seniorityPenalty = 5;
      notes.push("Einstiegsrolle trotz viel Erfahrung");
    }
  }

  const preferred = prefs.preferredCompanies.some((c) => normalizeCompany(c) && company.includes(normalizeCompany(c)));
  if (preferred) notes.push("Wunschfirma");

  const raw = skills + title + location + language - seniorityPenalty + (preferred ? 5 : 0);
  const score = Math.max(0, Math.min(100, raw));
  return {
    score,
    excluded,
    breakdown: {
      skills,
      title,
      location,
      language,
      seniorityPenalty,
      matchedSkills: matchedSkills.slice(0, 20),
      missingSkills: missingSkills.slice(0, 15),
      notes,
    },
  };
}
