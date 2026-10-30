import { htmlToText } from "@/lib/text";
import { extractEmail, fetchJson, type JobSource, type NormalizedJob } from "../types";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
};

export function normalizeRemotive(j: RemotiveJob): NormalizedJob {
  const description = htmlToText(j.description ?? "");
  return {
    source: "remotive",
    externalId: String(j.id),
    title: j.title.trim(),
    company: j.company_name.trim(),
    location: j.candidate_required_location || "Remote",
    country: null,
    remote: true,
    description,
    url: j.url,
    applyUrl: j.url,
    applyEmail: extractEmail(description),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    employmentType: j.job_type ?? null,
    tags: j.tags ?? [],
    postedAt: j.publication_date ? new Date(j.publication_date) : null,
  };
}

export const remotive: JobSource = {
  id: "remotive",
  label: "Remotive (Remote weltweit)",
  statusHint: "Öffentliche API; Quelle wird verlinkt, Abrufe sparsam",
  status: () => "active",
  async search(q, fetchImpl) {
    if (!q.remoteOnly && !q.includeRemote) return [];
    const out: NormalizedJob[] = [];
    for (const kw of q.keywords.slice(0, 2)) {
      const params = new URLSearchParams({ search: kw, limit: String(Math.min(q.limit, 50)) });
      const data = await fetchJson<{ jobs: RemotiveJob[] }>("remotive", `https://remotive.com/api/remote-jobs?${params}`, {}, fetchImpl);
      out.push(...(data.jobs ?? []).map(normalizeRemotive));
    }
    return out;
  },
};
