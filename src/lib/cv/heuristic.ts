import { detectSkills } from "@/lib/skills/dictionary";
import { normalize, uniq } from "@/lib/text";
import type { ParsedProfile } from "./types";

const LANGUAGES: Record<string, string[]> = {
  German: ["deutsch", "german", "allemand", "aleman"],
  English: ["englisch", "english", "anglais", "ingles"],
  Arabic: ["arabisch", "arabic", "arabe"],
  French: ["franzosisch", "french", "francais", "frances"],
  Spanish: ["spanisch", "spanish", "espagnol", "espanol"],
  Italian: ["italienisch", "italian"],
  Turkish: ["turkisch", "turkish"],
  Russian: ["russisch", "russian"],
  Polish: ["polnisch", "polish"],
  Portuguese: ["portugiesisch", "portuguese"],
  Dutch: ["niederlandisch", "dutch"],
  Chinese: ["chinesisch", "chinese", "mandarin"],
};
const LEVEL_RE =
  /\b(a1|a2|b1|b2|c1|c2|native|muttersprache|fluent|fliessend|verhandlungssicher|business fluent|grundkenntnisse|basic|intermediate|advanced|gut|sehr gut)\b/;

const SECTION_RE = {
  experience: /^(berufserfahrung|beruflicher werdegang|work experience|experience|professional experience|employment|praxiserfahrung)\b/,
  education: /^(ausbildung|bildung|bildungsweg|education|studium|academic)\b/,
  end: /^(kenntnisse|skills|sprachen|languages|zertifikate|certifications|projekte|projects|interessen|hobbies|referenzen)\b/,
};

const DATE_RANGE =
  /((?:0?[1-9]|1[0-2])[./]\s?)?((?:19|20)\d{2})\s*(?:-|–|—|bis|to)\s*((?:0?[1-9]|1[0-2])[./]\s?)?((?:19|20)\d{2}|heute|today|present|aktuell|now|jetzt|current)/gi;

/** Rough total years of experience from date ranges in the experience section (overlaps merged). */
export function estimateYears(section: string, now = new Date()): number | null {
  const ranges: [number, number][] = [];
  for (const m of section.matchAll(DATE_RANGE)) {
    const start = Number(m[2]);
    const endRaw = m[4]!.toLowerCase();
    const end = /^\d{4}$/.test(endRaw) ? Number(endRaw) : now.getFullYear();
    if (start >= 1960 && end >= start && end <= now.getFullYear() + 1) ranges.push([start, end]);
  }
  if (!ranges.length) return null;
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [cs, ce] = ranges[0]!;
  for (const [s, e] of ranges.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  total += ce - cs;
  return Math.min(total, 50);
}

function section(lines: string[], start: RegExp): string {
  const idx = lines.findIndex((l) => start.test(normalize(l)));
  if (idx < 0) return "";
  const out: string[] = [];
  for (const l of lines.slice(idx + 1)) {
    const n = normalize(l);
    if (SECTION_RE.end.test(n) || (start !== SECTION_RE.education && SECTION_RE.education.test(n)) || (start !== SECTION_RE.experience && SECTION_RE.experience.test(n))) break;
    out.push(l);
  }
  return out.join("\n");
}

/**
 * Deterministic fallback when no AI key is configured. Extracts only what is literally present.
 * Experience/education entries are not structured here – the user completes them in the editor.
 */
export function heuristicParse(text: string): ParsedProfile {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = text.match(/(?:\+|00)\d[\d\s/()-]{7,18}\d|\b0\d{2,5}[\s/-]?\d{3,}[\s-]?\d*\b/)?.[0]?.trim() ?? null;
  const nameLine = lines.slice(0, 6).find(
    (l) => /^[\p{L}'-]+(?:\s+[\p{L}'-]+){1,3}$/u.test(l) && !/(lebenslauf|curriculum|resume|cv)/i.test(l),
  );

  const languages: ParsedProfile["languages"] = [];
  for (const line of lines) {
    const n = normalize(line);
    for (const [lang, aliases] of Object.entries(LANGUAGES)) {
      if (languages.some((x) => x.name === lang)) continue;
      if (aliases.some((a) => new RegExp(`\\b${a}\\b`).test(n)) && (LEVEL_RE.test(n) || n.length < 60)) {
        const lvl = n.match(LEVEL_RE)?.[1] ?? null;
        languages.push({ name: lang, level: lvl && /^[abc][12]$/.test(lvl) ? lvl.toUpperCase() : lvl });
      }
    }
  }

  const expSection = section(lines, SECTION_RE.experience);
  return {
    fullName: nameLine ?? null,
    email,
    phone,
    location: null,
    headline: null,
    summary: null,
    skills: uniq(detectSkills(text, { strict: true })),
    languages,
    experience: [],
    education: [],
    certifications: [],
    yearsExperience: estimateYears(expSection || text),
    suggestedCategories: [],
    missingQualifications: [],
  };
}
