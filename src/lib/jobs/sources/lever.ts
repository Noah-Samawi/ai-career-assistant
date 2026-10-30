import { extractEmail, fetchJson, matchesKeywords, type JobSource, type NormalizedJob } from "../types";

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  country?: string;
  workplaceType?: "remote" | "hybrid" | "on-site" | "unspecified";
  categories?: { location?: string; commitment?: string; team?: string; department?: string };
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: { text: string; content: string }[];
  salaryRange?: { min?: number; max?: number; currency?: string };
};

export function normalizeLever(company: string, p: LeverPosting): NormalizedJob {
  const lists = (p.lists ?? []).map((l) => `${l.text}\n${l.content.replace(/<[^>]+>/g, " ")}`).join("\n\n");
  const description = [p.descriptionPlain, lists, p.additionalPlain].filter(Boolean).join("\n\n").trim();
  return {
    source: "lever",
    externalId: `${company}:${p.id}`,
    title: p.text.trim(),
    company,
    location: p.categories?.location ?? null,
    country: p.country?.toLowerCase() ?? null,
    remote: p.workplaceType === "remote",
    description,
    url: p.hostedUrl,
    applyUrl: p.applyUrl ?? p.hostedUrl,
    applyEmail: extractEmail(description),
    salaryMin: p.salaryRange?.min ?? null,
    salaryMax: p.salaryRange?.max ?? null,
    salaryCurrency: p.salaryRange?.currency ?? null,
    employmentType: p.categories?.commitment ?? null,
    tags: [p.categories?.team, p.categories?.department].filter((x): x is string => !!x),
    postedAt: p.createdAt ? new Date(p.createdAt) : null,
  };
}

export const lever: JobSource = {
  id: "lever",
  label: "Lever (Firmen-Boards)",
  statusHint: "Öffentliche Postings API – Firmen-Slug im Loop eintragen",
  status: () => "active",
  async search(q, fetchImpl) {
    const out: NormalizedJob[] = [];
    for (const raw of q.leverCompanies.slice(0, 15)) {
      const company = raw.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(company)) continue;
      const data = await fetchJson<LeverPosting[]>("lever", `https://api.lever.co/v0/postings/${company}?mode=json`, {}, fetchImpl);
      for (const p of data ?? []) {
        if (!matchesKeywords(p.text, q.keywords)) continue;
        out.push(normalizeLever(company, p));
      }
    }
    return out;
  },
};
