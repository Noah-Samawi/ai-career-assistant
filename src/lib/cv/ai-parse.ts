import { completeJson, type AiProvider } from "@/lib/ai";
import { parsedProfileSchema, type ParsedProfile } from "./types";

const SYSTEM = `You are a precise CV parser for a job-application platform.
Rules:
- Extract ONLY information that is explicitly present in the CV text. Never invent, infer or embellish facts.
- If a field is not present, use null (or an empty array).
- Dates as "YYYY-MM" or "YYYY". Use null for "end" if the position is current.
- "skills": concrete hard skills, tools, technologies and methods mentioned in the CV (max 60), canonical spelling (e.g. "TypeScript", "Node.js").
- "languages": spoken languages with the level as written in the CV (e.g. "C1", "Muttersprache").
- "yearsExperience": total professional years derived from experience dates (integer) or null.
- "suggestedCategories": 3-6 realistic job titles this person can apply for today, based only on the CV.
- "missingQualifications": 0-6 qualifications that are commonly required for those suggested roles but absent from the CV. Phrase as short noun phrases.
- Keep descriptions short (max 300 chars each), in the CV's original language.
Return JSON with keys: fullName, email, phone, location, headline, summary, skills, languages[{name,level}], experience[{title,company,location,start,end,description}], education[{degree,institution,start,end}], certifications, yearsExperience, suggestedCategories, missingQualifications.`;

export async function aiParse(cvText: string): Promise<{ profile: ParsedProfile; provider: AiProvider }> {
  const { data, provider } = await completeJson(
    { system: SYSTEM, user: `CV TEXT:\n"""\n${cvText.slice(0, 30_000)}\n"""`, maxTokens: 4000, temperature: 0 },
    parsedProfileSchema,
  );
  return { profile: data, provider };
}
