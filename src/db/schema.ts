import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "pro", "premium"]);
export const parseStatusEnum = pgEnum("parse_status", ["pending", "parsed", "failed"]);
export const loopModeEnum = pgEnum("loop_mode", ["approval", "auto_prepare"]);
export const matchStatusEnum = pgEnum("match_status", ["new", "excluded", "dismissed", "drafted"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "pending_approval",
  "approved",
  "submitted",
  "applied_externally",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]);
export const applicationChannelEnum = pgEnum("application_channel", ["external_link", "email", "ats_api"]);
export const runStatusEnum = pgEnum("run_status", ["running", "succeeded", "partial", "failed"]);

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  locale: text("locale").notNull().default("de"),
  timezone: text("timezone").notNull().default("Europe/Berlin"),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256(token)
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    userAgent: text("user_agent"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const cvDocuments = pgTable("cv_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  sha256: text("sha256").notNull(),
  extractedText: text("extracted_text"),
  parseStatus: parseStatusEnum("parse_status").notNull().default("pending"),
  parseMethod: text("parse_method"), // "ai:<provider>" | "heuristic"
  parseError: text("parse_error"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type ExperienceItem = {
  title: string;
  company: string | null;
  location: string | null;
  start: string | null; // YYYY-MM or YYYY
  end: string | null; // null = current
  description: string | null;
};
export type EducationItem = { degree: string; institution: string | null; start: string | null; end: string | null };
export type LanguageItem = { name: string; level: string | null };

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    cvDocumentId: uuid("cv_document_id").references(() => cvDocuments.id, { onDelete: "set null" }),
    label: text("label").notNull().default("Hauptprofil"),
    isPrimary: boolean("is_primary").notNull().default(true),
    fullName: text("full_name"),
    email: text("email"),
    phone: text("phone"),
    location: text("location"),
    headline: text("headline"),
    summary: text("summary"),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    languages: jsonb("languages").$type<LanguageItem[]>().notNull().default([]),
    experience: jsonb("experience").$type<ExperienceItem[]>().notNull().default([]),
    education: jsonb("education").$type<EducationItem[]>().notNull().default([]),
    certifications: jsonb("certifications").$type<string[]>().notNull().default([]),
    yearsExperience: integer("years_experience"),
    suggestedCategories: jsonb("suggested_categories").$type<string[]>().notNull().default([]),
    missingQualifications: jsonb("missing_qualifications").$type<string[]>().notNull().default([]),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("profiles_user_idx").on(t.userId)],
);

export const loops = pgTable(
  "loops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    jobTitles: jsonb("job_titles").$type<string[]>().notNull().default([]),
    locations: jsonb("locations").$type<string[]>().notNull().default([]),
    countries: jsonb("countries").$type<string[]>().notNull().default([]), // ISO-3166 alpha-2, lowercase
    remoteOnly: boolean("remote_only").notNull().default(false),
    includeRemote: boolean("include_remote").notNull().default(true),
    sources: jsonb("sources").$type<string[]>().notNull().default([]),
    greenhouseBoards: jsonb("greenhouse_boards").$type<string[]>().notNull().default([]),
    leverCompanies: jsonb("lever_companies").$type<string[]>().notNull().default([]),
    preferredCompanies: jsonb("preferred_companies").$type<string[]>().notNull().default([]),
    excludedCompanies: jsonb("excluded_companies").$type<string[]>().notNull().default([]),
    excludedKeywords: jsonb("excluded_keywords").$type<string[]>().notNull().default([]),
    minScore: integer("min_score").notNull().default(60),
    dailyLimit: integer("daily_limit").notNull().default(10),
    mode: loopModeEnum("mode").notNull().default("approval"),
    coverLetterLanguage: text("cover_letter_language").notNull().default("auto"),
    active: boolean("active").notNull().default(true),
    lastRunAt: ts("last_run_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("loops_user_idx").on(t.userId)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    dedupeHash: text("dedupe_hash").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    country: text("country"),
    remote: boolean("remote").notNull().default(false),
    description: text("description").notNull().default(""),
    url: text("url").notNull(),
    applyUrl: text("apply_url"),
    applyEmail: text("apply_email"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    employmentType: text("employment_type"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    postedAt: ts("posted_at"),
    fetchedAt: ts("fetched_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("jobs_source_external_uq").on(t.source, t.externalId),
    index("jobs_dedupe_idx").on(t.dedupeHash),
  ],
);

export type ScoreBreakdown = {
  skills: number;
  title: number;
  location: number;
  language: number;
  seniorityPenalty: number;
  matchedSkills: string[];
  missingSkills: string[];
  notes: string[];
};

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    loopId: uuid("loop_id").references(() => loops.id, { onDelete: "set null" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    breakdown: jsonb("breakdown").$type<ScoreBreakdown>().notNull(),
    status: matchStatusEnum("status").notNull().default("new"),
    exclusionReason: text("exclusion_reason"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("matches_user_job_uq").on(t.userId, t.jobId), index("matches_loop_idx").on(t.loopId)],
);

export type SubmissionConfirmation = {
  channel: "email" | "ats_api";
  reference: string; // e.g. Gmail message id, ATS application id
  confirmedAt: string;
  raw?: unknown;
};

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    status: applicationStatusEnum("status").notNull().default("draft"),
    channel: applicationChannelEnum("channel").notNull().default("external_link"),
    coverLetter: text("cover_letter"),
    coverLetterLanguage: text("cover_letter_language"),
    coverLetterMethod: text("cover_letter_method"),
    claimWarnings: jsonb("claim_warnings").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    confirmation: jsonb("confirmation").$type<SubmissionConfirmation>(),
    appliedAt: ts("applied_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("applications_user_job_uq").on(t.userId, t.jobId), index("applications_status_idx").on(t.userId, t.status)],
);

export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
    actor: text("actor").notNull(), // user | agent | system
    type: text("type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("app_events_app_idx").on(t.applicationId)],
);

export type RunStats = {
  fetched: number;
  newJobs: number;
  scored: number;
  matched: number;
  excluded: number;
  drafts: number;
  skippedByLimit: number;
};

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    loopId: uuid("loop_id").references(() => loops.id, { onDelete: "cascade" }),
    trigger: text("trigger").notNull(), // manual | schedule
    status: runStatusEnum("status").notNull().default("running"),
    stats: jsonb("stats").$type<RunStats>(),
    sourceResults: jsonb("source_results").$type<{ source: string; ok: boolean; count: number; error?: string }[]>(),
    error: text("error"),
    startedAt: ts("started_at").notNull().defaultNow(),
    finishedAt: ts("finished_at"),
  },
  (t) => [index("agent_runs_user_idx").on(t.userId, t.startedAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const usageCounters = pgTable(
  "usage_counters",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    metric: text("metric").notNull(),
    period: date("period").notNull(), // day or first day of month
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.metric, t.period] })],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_user_idx").on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Loop = typeof loops.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationStatus = Application["status"];
