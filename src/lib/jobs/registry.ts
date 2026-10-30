import type { JobSource } from "./types";
import { arbeitsagentur } from "./sources/arbeitsagentur";
import { arbeitnow } from "./sources/arbeitnow";
import { greenhouse } from "./sources/greenhouse";
import { lever } from "./sources/lever";
import { remotive } from "./sources/remotive";
import { adzuna } from "./sources/adzuna";
import { serpapi } from "./sources/serpapi";

export const SOURCES: JobSource[] = [arbeitsagentur, arbeitnow, adzuna, serpapi, greenhouse, lever, remotive];

export function getSource(id: string): JobSource | undefined {
  return SOURCES.find((s) => s.id === id);
}

/** Platforms users ask for that have no public/permitted API – shown honestly in the UI. */
export const UNAVAILABLE_PLATFORMS = [
  { name: "LinkedIn Jobs", reason: "Job-Such-API nur für LinkedIn-Partner" },
  { name: "Indeed", reason: "Publisher-API eingestellt; Stellen teils über Google Jobs auffindbar" },
  { name: "StepStone", reason: "Keine öffentliche API; teils über Google Jobs auffindbar" },
  { name: "Xing", reason: "Keine öffentliche Job-API" },
  { name: "Glassdoor", reason: "API nur für Partner" },
  { name: "Monster", reason: "Keine öffentliche Such-API" },
  { name: "ZipRecruiter", reason: "Nur Partner-/Publisher-Programm" },
  { name: "Workday-Portale", reason: "Kein offizielles öffentliches API – geplant als Browser-Extension (Phase 4)" },
];
