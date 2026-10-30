import { fetchJson, type JobSource, type NormalizedJob } from "../types";

// Public API of the German Federal Employment Agency. Docs: https://jobsuche.api.bund.dev/
const BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const API_KEY = "jobboerse-jobsuche"; // public client id published by BA

type BaJob = {
  refnr: string;
  titel?: string;
  beruf?: string;
  arbeitgeber?: string;
  aktuelleVeroeffentlichungsdatum?: string;
  eintrittsdatum?: string;
  externeUrl?: string;
  arbeitsort?: { ort?: string; plz?: string; region?: string; land?: string };
};
type BaResponse = { stellenangebote?: BaJob[]; maxErgebnisse?: number };

export function normalizeBa(j: BaJob): NormalizedJob {
  const loc = [j.arbeitsort?.plz, j.arbeitsort?.ort].filter(Boolean).join(" ") || j.arbeitsort?.region || null;
  return {
    source: "arbeitsagentur",
    externalId: j.refnr,
    title: (j.titel ?? j.beruf ?? "Stellenangebot").trim(),
    company: (j.arbeitgeber ?? "Unbekannt").trim(),
    location: loc,
    country: "de",
    remote: false,
    // The list endpoint has no description; "beruf" carries the occupation classification.
    description: [j.titel, j.beruf].filter(Boolean).join("\n"),
    url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(j.refnr)}`,
    applyUrl: j.externeUrl ?? null,
    applyEmail: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    employmentType: null,
    tags: j.beruf ? [j.beruf] : [],
    postedAt: j.aktuelleVeroeffentlichungsdatum ? new Date(j.aktuelleVeroeffentlichungsdatum) : null,
  };
}

export const arbeitsagentur: JobSource = {
  id: "arbeitsagentur",
  label: "Bundesagentur für Arbeit",
  statusHint: "Offizielle öffentliche API, Deutschland",
  status: () => "active",
  async search(q, fetchImpl) {
    if (q.countries.length && !q.countries.includes("de")) return [];
    const out: NormalizedJob[] = [];
    const wheres = q.locations.length ? q.locations.slice(0, 3) : [""];
    for (const was of q.keywords.slice(0, 3)) {
      for (const wo of wheres) {
        const params = new URLSearchParams({ was, size: String(Math.min(q.limit, 50)), page: "1", veroeffentlichtseit: "14" });
        if (wo) {
          params.set("wo", wo);
          params.set("umkreis", "30");
        }
        const data = await fetchJson<BaResponse>(
          "arbeitsagentur",
          `${BASE}/pc/v4/jobs?${params}`,
          { headers: { "X-API-Key": API_KEY } },
          fetchImpl,
        );
        out.push(...(data.stellenangebote ?? []).filter((j) => j.refnr).map(normalizeBa));
      }
    }
    return out;
  },
};
