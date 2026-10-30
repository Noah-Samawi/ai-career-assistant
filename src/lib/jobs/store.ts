import { sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Job } from "@/db/schema";
import { dedupeHash } from "./dedupe";
import type { NormalizedJob } from "./types";

/** Upserts jobs by (source, external_id). Keeps the longer description. Returns stored rows. */
export async function upsertJobs(items: NormalizedJob[]): Promise<Job[]> {
  if (!items.length) return [];
  const seen = new Set<string>();
  const unique = items.filter((j) => {
    const k = `${j.source}|${j.externalId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const rows: Job[] = [];
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200).map((j) => ({
      ...j,
      title: j.title.slice(0, 300),
      company: j.company.slice(0, 200),
      description: j.description.slice(0, 20_000),
      dedupeHash: dedupeHash(j),
    }));
    const res = await getDb()
      .insert(schema.jobs)
      .values(chunk)
      .onConflictDoUpdate({
        target: [schema.jobs.source, schema.jobs.externalId],
        set: {
          fetchedAt: sql`now()`,
          title: sql`excluded.title`,
          applyUrl: sql`coalesce(excluded.apply_url, ${schema.jobs.applyUrl})`,
          description: sql`case when length(excluded.description) > length(${schema.jobs.description}) then excluded.description else ${schema.jobs.description} end`,
        },
      })
      .returning();
    rows.push(...res);
  }
  return rows;
}
