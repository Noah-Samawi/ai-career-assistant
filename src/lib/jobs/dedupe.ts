import { createHash } from "node:crypto";
import { normalize } from "@/lib/text";

const LEGAL_FORMS = /\b(gmbh|ag|se|kg|ohg|ug|mbh|co|inc|llc|ltd|limited|plc|corp|corporation|sa|sas|bv|nv|haftungsbeschrankt)\b/g;
const GENDER = /\(?\b[mwdfx]\s*\/\s*[mwdfx](\s*\/\s*[mwdfx])?\b\)?|\(all genders\)|\(gn\)/g;

export function normalizeCompany(c: string): string {
  return normalize(c).replace(LEGAL_FORMS, "").replace(/[.&]/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeTitle(t: string): string {
  return normalize(t.toLowerCase().replace(GENDER, " ")).replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCity(l: string | null): string {
  if (!l) return "";
  return normalize(l.split(/[,(]/)[0]!).replace(/\b\d{4,5}\b/g, "").trim();
}

/** Cross-source identity of a posting: same company + title + city ⇒ same job. */
export function dedupeHash(j: { company: string; title: string; location: string | null; remote: boolean }): string {
  const key = [normalizeCompany(j.company), normalizeTitle(j.title), j.remote && !j.location ? "remote" : normalizeCity(j.location)].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}
