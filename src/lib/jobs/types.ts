export type NormalizedJob = {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  country: string | null; // ISO alpha-2 lowercase
  remote: boolean;
  description: string; // plain text
  url: string;
  applyUrl: string | null;
  applyEmail: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  employmentType: string | null;
  tags: string[];
  postedAt: Date | null;
};

export type SearchQuery = {
  keywords: string[]; // job titles
  locations: string[];
  countries: string[];
  remoteOnly: boolean;
  includeRemote: boolean;
  greenhouseBoards: string[];
  leverCompanies: string[];
  limit: number; // per source
};

export type SourceStatus = "active" | "needs_config" | "unavailable";

export interface JobSource {
  id: string;
  label: string;
  /** Whether the source can run with the current configuration. */
  status(): SourceStatus;
  statusHint: string;
  search(q: SearchQuery, fetchImpl?: typeof fetch): Promise<NormalizedJob[]>;
}

export class SourceError extends Error {
  constructor(public source: string, message: string) {
    super(`[${source}] ${message}`);
  }
}

export async function fetchJson<T>(source: string, url: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  const res = await fetchImpl(url, {
    ...init,
    headers: { accept: "application/json", "user-agent": "NoavioCareer/0.1 (+job-search-assistant)", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new SourceError(source, `HTTP ${res.status} for ${new URL(url).pathname}`);
  return (await res.json()) as T;
}

export function extractEmail(text: string): string | null {
  return text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0]?.toLowerCase() ?? null;
}

const REMOTE_RE = /\b(remote|home ?office|work from home|wfh|telearbeit|mobiles arbeiten|teletravail|remoto)\b/i;
export function looksRemote(...parts: (string | null | undefined)[]): boolean {
  return parts.some((p) => !!p && REMOTE_RE.test(p));
}

/** Simple keyword pre-filter for feeds that don't support server-side search. */
export function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const hay = text.toLowerCase();
  return keywords.some((k) =>
    k
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .every((w) => hay.includes(w)),
  );
}
