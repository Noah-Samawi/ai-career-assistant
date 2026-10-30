import { htmlToText } from "@/lib/text";
import { extractEmail, fetchJson, matchesKeywords, type JobSource, type NormalizedJob } from "../types";

type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
};

export function normalizeArbeitnow(j: ArbeitnowJob): NormalizedJob {
  const description = htmlToText(j.description ?? "");
  return {
    source: "arbeitnow",
    externalId: j.slug,
    title: j.title.trim(),
    company: j.company_name.trim(),
    location: j.location || null,
    country: null, // Arbeitnow is mostly DE/EU but does not state a country
    remote: Boolean(j.remote),
    description,
    url: j.url,
    applyUrl: j.url,
    applyEmail: extractEmail(description),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    employmentType: j.job_types?.[0] ?? null,
    tags: j.tags ?? [],
    postedAt: j.created_at ? new Date(j.created_at * 1000) : null,
  };
}

export const arbeitnow: JobSource = {
  id: "arbeitnow",
  label: "Arbeitnow",
  statusHint: "Öffentlicher Feed (Deutschland/EU, Remote)",
  status: () => "active",
  async search(q, fetchImpl) {
    // Feed has no server-side search → read the first pages and filter locally.
    const out: NormalizedJob[] = [];
    for (let page = 1; page <= 3 && out.length < q.limit; page++) {
      const data = await fetchJson<{ data: ArbeitnowJob[] }>("arbeitnow", `https://www.arbeitnow.com/api/job-board-api?page=${page}`, {}, fetchImpl);
      for (const j of data.data ?? []) {
        if (!matchesKeywords(`${j.title} ${j.tags?.join(" ")}`, q.keywords)) continue;
        if (q.remoteOnly && !j.remote) continue;
        out.push(normalizeArbeitnow(j));
      }
      if (!data.data?.length) break;
    }
    return out.slice(0, q.limit);
  },
};
