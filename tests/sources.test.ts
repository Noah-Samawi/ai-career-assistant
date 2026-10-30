import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { greenhouse } from "@/lib/jobs/sources/greenhouse";
import { normalizeBa } from "@/lib/jobs/sources/arbeitsagentur";
import { normalizeLever } from "@/lib/jobs/sources/lever";
import { normalizeArbeitnow } from "@/lib/jobs/sources/arbeitnow";

const q = { keywords: ["Developer"], locations: [], countries: [], remoteOnly: false, includeRemote: true, greenhouseBoards: ["acme"], leverCompanies: [], limit: 50 };

describe("source adapters (recorded API shapes)", () => {
  it("greenhouse: fetches board, filters by keyword, decodes HTML", async () => {
    const fake = (async (url: string) => {
      expect(url).toBe("https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true");
      return new Response(readFileSync("tests/fixtures/greenhouse-board.json"), { status: 200 });
    }) as typeof fetch;
    const jobs = await greenhouse.search(q, fake);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ source: "greenhouse", externalId: "acme:101", company: "Acme", remote: false });
    expect(jobs[0]!.description).toContain("TypeScript, React");
    expect(jobs[0]!.description).not.toContain("<p>");
  });

  it("greenhouse: rejects unsafe board tokens", async () => {
    const fake = (async () => { throw new Error("should not be called"); }) as unknown as typeof fetch;
    await expect(greenhouse.search({ ...q, greenhouseBoards: ["../evil"] }, fake)).resolves.toEqual([]);
  });

  it("propagates HTTP errors as SourceError", async () => {
    const fake = (async () => new Response("nope", { status: 503 })) as typeof fetch;
    await expect(greenhouse.search(q, fake)).rejects.toThrow(/\[greenhouse\] HTTP 503/);
  });

  it("arbeitsagentur: maps refnr to public detail URL", () => {
    const j = normalizeBa({ refnr: "10000-1234-S", titel: "Softwareentwickler (m/w/d)", arbeitgeber: "Muster GmbH", arbeitsort: { ort: "Frankfurt", plz: "60311" } });
    expect(j.url).toBe("https://www.arbeitsagentur.de/jobsuche/jobdetail/10000-1234-S");
    expect(j.location).toBe("60311 Frankfurt");
    expect(j.country).toBe("de");
  });

  it("lever: remote workplace + description lists", () => {
    const j = normalizeLever("plaid", { id: "abc", text: "Engineer", hostedUrl: "https://jobs.lever.co/plaid/abc", workplaceType: "remote", descriptionPlain: "Intro", lists: [{ text: "Requirements", content: "<li>Go</li>" }] });
    expect(j.remote).toBe(true);
    expect(j.description).toContain("Requirements");
    expect(j.externalId).toBe("plaid:abc");
  });

  it("arbeitnow: unix timestamp + apply email extraction", () => {
    const j = normalizeArbeitnow({ slug: "s", company_name: "C", title: "T", description: "<p>Bewerbung an jobs@c.de</p>", remote: true, url: "https://x", tags: [], job_types: [], location: "Berlin", created_at: 1793385617 });
    expect(j.applyEmail).toBe("jobs@c.de");
    expect(j.postedAt?.getUTCFullYear()).toBe(2026);
  });
});
