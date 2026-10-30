import { env } from "@/lib/env";
import { htmlToText } from "@/lib/text";
import { fetchJson, looksRemote, type JobSource, type NormalizedJob } from "../types";

const COUNTRIES = ["at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb", "in", "it", "mx", "nl", "nz", "pl", "sg", "us", "za"];
const CURRENCY: Record<string, string> = { gb: "GBP", us: "USD", ca: "CAD", au: "AUD", ch: "CHF", in: "INR", pl: "PLN", br: "BRL", mx: "MXN", nz: "NZD", sg: "SGD", za: "ZAR" };

type AdzunaJob = {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  created?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  category?: { label?: string };
};

export function normalizeAdzuna(country: string, j: AdzunaJob): NormalizedJob {
  const description = htmlToText(j.description ?? "");
  return {
    source: "adzuna",
    externalId: `${country}:${j.id}`,
    title: htmlToText(j.title),
    company: j.company?.display_name?.trim() || "Unbekannt",
    location: j.location?.display_name ?? null,
    country,
    remote: looksRemote(j.title, description),
    description, // Adzuna returns a snippet only
    url: j.redirect_url,
    applyUrl: j.redirect_url,
    applyEmail: null,
    salaryMin: j.salary_min ? Math.round(j.salary_min) : null,
    salaryMax: j.salary_max ? Math.round(j.salary_max) : null,
    salaryCurrency: j.salary_min ? (CURRENCY[country] ?? "EUR") : null,
    employmentType: j.contract_time ?? null,
    tags: j.category?.label ? [j.category.label] : [],
    postedAt: j.created ? new Date(j.created) : null,
  };
}

export const adzuna: JobSource = {
  id: "adzuna",
  label: "Adzuna (19 Länder)",
  statusHint: "Benötigt ADZUNA_APP_ID und ADZUNA_APP_KEY (kostenlos)",
  status: () => (env().ADZUNA_APP_ID && env().ADZUNA_APP_KEY ? "active" : "needs_config"),
  async search(q, fetchImpl) {
    const { ADZUNA_APP_ID, ADZUNA_APP_KEY } = env();
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
    const countries = (q.countries.length ? q.countries : ["de"]).filter((c) => COUNTRIES.includes(c)).slice(0, 3);
    const out: NormalizedJob[] = [];
    for (const country of countries) {
      for (const what of q.keywords.slice(0, 3)) {
        const params = new URLSearchParams({
          app_id: ADZUNA_APP_ID,
          app_key: ADZUNA_APP_KEY,
          what,
          results_per_page: String(Math.min(q.limit, 50)),
          max_days_old: "14",
        });
        if (q.locations[0]) params.set("where", q.locations[0]);
        const data = await fetchJson<{ results: AdzunaJob[] }>("adzuna", `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`, {}, fetchImpl);
        out.push(...(data.results ?? []).map((j) => normalizeAdzuna(country, j)));
      }
    }
    return out;
  },
};
