import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { extractEmail, fetchJson, type JobSource, type NormalizedJob } from "../types";

type SerpJob = {
  job_id?: string;
  title: string;
  company_name: string;
  location?: string;
  via?: string;
  description?: string;
  share_link?: string;
  detected_extensions?: { work_from_home?: boolean; schedule_type?: string; posted_at?: string };
  apply_options?: { title: string; link: string }[];
};

export function normalizeSerp(country: string | null, j: SerpJob): NormalizedJob {
  const description = j.description ?? "";
  const id = j.job_id ?? createHash("sha1").update(`${j.title}|${j.company_name}|${j.location}`).digest("hex");
  const apply = j.apply_options?.[0]?.link ?? null;
  return {
    source: "google_jobs",
    externalId: id.slice(0, 200),
    title: j.title.trim(),
    company: j.company_name.trim(),
    location: j.location ?? null,
    country,
    remote: Boolean(j.detected_extensions?.work_from_home),
    description,
    url: apply ?? j.share_link ?? "https://www.google.com/search?q=jobs",
    applyUrl: apply,
    applyEmail: extractEmail(description),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    employmentType: j.detected_extensions?.schedule_type ?? null,
    tags: j.via ? [j.via] : [],
    postedAt: null,
  };
}

export const serpapi: JobSource = {
  id: "google_jobs",
  label: "Google Jobs (via SerpAPI)",
  statusHint: "Benötigt SERPAPI_KEY – deckt u. a. StepStone, Indeed, LinkedIn-Anzeigen ab, soweit Google sie listet",
  status: () => (env().SERPAPI_KEY ? "active" : "needs_config"),
  async search(q, fetchImpl) {
    const key = env().SERPAPI_KEY;
    if (!key) return [];
    const out: NormalizedJob[] = [];
    const country = q.countries[0] ?? null;
    for (const kw of q.keywords.slice(0, 2)) {
      const params = new URLSearchParams({ engine: "google_jobs", q: kw, api_key: key, hl: "en" });
      if (q.locations[0]) params.set("location", q.locations[0]);
      if (country) params.set("gl", country);
      if (q.remoteOnly) params.set("ltype", "1");
      const data = await fetchJson<{ jobs_results?: SerpJob[]; error?: string }>("google_jobs", `https://serpapi.com/search.json?${params}`, {}, fetchImpl);
      out.push(...(data.jobs_results ?? []).map((j) => normalizeSerp(country, j)));
    }
    return out;
  },
};
