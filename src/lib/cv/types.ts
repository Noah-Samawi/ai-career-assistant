import { z } from "zod";

const nullableStr = z.string().trim().min(1).nullable().catch(null);

export const parsedProfileSchema = z.object({
  fullName: nullableStr,
  email: nullableStr,
  phone: nullableStr,
  location: nullableStr,
  headline: nullableStr,
  summary: nullableStr,
  skills: z.array(z.string()).catch([]),
  languages: z.array(z.object({ name: z.string(), level: z.string().nullable().catch(null) })).catch([]),
  experience: z
    .array(
      z.object({
        title: z.string(),
        company: z.string().nullable().catch(null),
        location: z.string().nullable().catch(null),
        start: z.string().nullable().catch(null),
        end: z.string().nullable().catch(null),
        description: z.string().nullable().catch(null),
      }),
    )
    .catch([]),
  education: z
    .array(
      z.object({
        degree: z.string(),
        institution: z.string().nullable().catch(null),
        start: z.string().nullable().catch(null),
        end: z.string().nullable().catch(null),
      }),
    )
    .catch([]),
  certifications: z.array(z.string()).catch([]),
  yearsExperience: z.number().int().min(0).max(60).nullable().catch(null),
  suggestedCategories: z.array(z.string()).catch([]),
  missingQualifications: z.array(z.string()).catch([]),
});

export type ParsedProfile = z.infer<typeof parsedProfileSchema>;
