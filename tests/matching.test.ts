import { describe, expect, it } from "vitest";
import { scoreJob, titleSimilarity } from "@/lib/matching/score";

const profile = {
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"],
  languages: [{ name: "German", level: "C1" }, { name: "English", level: "C1" }],
  yearsExperience: 6,
  experienceTitles: ["Full-Stack Developer"],
  headline: "Full-Stack Developer",
};
const prefs = {
  jobTitles: ["Full Stack Developer", "Softwareentwickler"],
  locations: ["Frankfurt"],
  countries: ["de"],
  remoteOnly: false,
  includeRemote: true,
  excludedCompanies: ["Evil Corp GmbH"],
  excludedKeywords: ["Praktikum"],
  preferredCompanies: [],
};
const goodJob = {
  title: "Full Stack Developer (m/w/d)",
  company: "Good GmbH",
  location: "60311 Frankfurt am Main",
  country: "de",
  remote: false,
  description:
    "Wir suchen eine:n Entwickler:in mit Erfahrung in TypeScript, React, Node.js und PostgreSQL. Du arbeitest mit Docker und Kubernetes in einem agilen Team. Wir bieten flexible Arbeitszeiten und die Kenntnisse in Englisch sind von Vorteil, unsere Sprache ist Deutsch.",
  tags: [],
};

describe("scoreJob", () => {
  it("scores a strong fit high and explains it", () => {
    const r = scoreJob(goodJob, profile, prefs);
    expect(r.excluded).toBeNull();
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.breakdown.matchedSkills).toEqual(expect.arrayContaining(["TypeScript", "React"]));
    expect(r.breakdown.missingSkills).toContain("Kubernetes");
  });

  it("scores an unrelated job low", () => {
    const r = scoreJob(
      { ...goodJob, title: "Pflegefachkraft (m/w/d)", description: "Pflege von Patientinnen und Patienten im Schichtdienst, Krankenpflege Ausbildung erforderlich und wir bieten ein tolles Team.", location: "Hamburg", country: "de" },
      profile,
      prefs,
    );
    expect(r.score).toBeLessThan(40);
  });

  it("excludes companies with or without legal form", () => {
    expect(scoreJob({ ...goodJob, company: "Evil Corp" }, profile, prefs).excluded).toMatch(/Firma/);
  });

  it("excludes keywords and non-remote jobs when remote-only", () => {
    expect(scoreJob({ ...goodJob, title: "Praktikum Full Stack" }, profile, prefs).excluded).toMatch(/Stichwort/);
    expect(scoreJob(goodJob, profile, { ...prefs, remoteOnly: true }).excluded).toMatch(/Remote/);
  });

  it("penalises senior roles for juniors", () => {
    const junior = { ...profile, yearsExperience: 1 };
    const normal = scoreJob(goodJob, junior, prefs).score;
    const senior = scoreJob({ ...goodJob, title: "Senior Full Stack Developer" }, junior, prefs);
    expect(senior.breakdown.seniorityPenalty).toBeGreaterThan(0);
    expect(senior.score).toBeLessThan(normal);
  });

  it("is always within 0..100", () => {
    const r = scoreJob({ ...goodJob, company: "Good" }, profile, { ...prefs, preferredCompanies: ["Good"] });
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("titleSimilarity", () => {
  it("ignores gender suffixes and matches compounds", () => {
    expect(titleSimilarity("Softwareentwickler (m/w/d) Backend", ["Softwareentwickler"])).toBe(1);
    expect(titleSimilarity("Accountant", ["Full Stack Developer"])).toBe(0);
  });
});
