import { aliasesFor, detectSkills } from "@/lib/skills/dictionary";

/**
 * Flags skills mentioned in a cover letter that are not in the candidate's profile.
 * Not a blocker – shown to the user before approval so nothing untrue goes out.
 */
export function findUnsupportedSkills(letter: string, profileSkills: string[]): string[] {
  const own = new Set(profileSkills.map((s) => aliasesFor(s)[0]));
  return detectSkills(letter, { strict: true }).filter((s) => !own.has(aliasesFor(s)[0]));
}
