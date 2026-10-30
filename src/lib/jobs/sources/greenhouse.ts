import { htmlToText } from "@/lib/text";
import { extractEmail, fetchJson, looksRemote, matchesKeywords, type JobSource, type NormalizedJob } from "../types";

type GhJob = {
  id: number;
  title: string;
  absolute_url: string;
  company_name?: string;
  location?: { name?: string };
  content?: string;
  first_published?: string;
  updated_at?: string;
  departments?: { name: string }[];
};

export function normalizeGreenhouse(board: string, j: GhJob): NormalizedJob {
  const description = htmlToText(j.content ?? "");
  const location = j.location?.name ?? null;
  return {
    source: "greenhouse",
    externalId: `${board}:${j.id}`,
    title: j.title.trim(),
    company: j.company_name?.trim() || board,
    location,
    country: null,
    remote: looksRemote(location, j.title),
    description,
    url: j.absolute_url,
    applyUrl: j.absolute_url,
    applyEmail: extractEmail(description),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    employmentType: null,
    tags: (j.departments ?? []).map((d) => d.name),
    postedAt: j.first_published ? new Date(j.first_published) : j.updated_at ? new Date(j.updated_at) : null,
  };
}

export const greenhouse: JobSource = {
  id: "greenhouse",
  label: "Greenhouse (Firmen-Boards)",
  statusHint: "Öffentliche Job Board API – Board-Token der Firma im Loop eintragen",
  status: () => "active",
  async search(q, fetchImpl) {
    const out: NormalizedJob[] = [];
    for (const board of q.greenhouseBoards.slice(0, 15)) {
      const slug = board.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(slug)) continue;
      const data = await fetchJson<{ jobs: GhJob[] }>("greenhouse", `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, {}, fetchImpl);
      for (const j of data.jobs ?? []) {
        if (!matchesKeywords(j.title, q.keywords)) continue;
        out.push(normalizeGreenhouse(slug, j));
      }
    }
    return out;
  },
};
