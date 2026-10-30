import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { activeProvider } from "@/lib/ai";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { saveProfileAction, uploadCvAction } from "@/app/actions/cv";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Alert, Badge, Card, CardHeader, Field, Input, PageHeader, Textarea, formatDate } from "@/components/ui";

export const metadata = { title: "CV" };

export default async function CvPage({ searchParams }: PageProps<"/cv">) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const db = getDb();
  const [docs, profiles] = await Promise.all([
    db.select().from(schema.cvDocuments).where(eq(schema.cvDocuments.userId, user.id)).orderBy(desc(schema.cvDocuments.createdAt)),
    db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id)).orderBy(desc(schema.profiles.isPrimary), schema.profiles.createdAt),
  ]);
  const sp = await searchParams;
  const profile = profiles.find((p) => p.id === sp.profile) ?? profiles[0];
  const doc = docs.find((d) => d.id === profile?.cvDocumentId);
  const canAddProfile = profiles.length < PLAN_LIMITS[user.plan as Plan].profiles;
  const ai = activeProvider();

  return (
    <>
      <PageHeader title={t("cv.title")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {!profile ? (
            <Alert>{t("cv.noProfile")}</Alert>
          ) : (
            <Card>
              <CardHeader
                title={t("cv.profile")}
                sub={doc?.parseMethod?.startsWith("ai") ? t("cv.method.ai") : t("cv.method.heuristic")}
                action={
                  profiles.length > 1 ? (
                    <div className="flex gap-1">
                      {profiles.map((p) => (
                        <a key={p.id} href={`/cv?profile=${p.id}`} className={`rounded-md px-2 py-1 text-xs ${p.id === profile.id ? "bg-surface-2 font-semibold" : "text-muted"}`}>
                          {p.label}
                        </a>
                      ))}
                    </div>
                  ) : null
                }
              />
              {doc?.parseError && (
                <div className="px-5 pt-4">
                  <Alert tone="warn">{doc.parseError}</Alert>
                </div>
              )}
              <ActionForm action={saveProfileAction} className="space-y-5 p-5">
                <input type="hidden" name="id" value={profile.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("cv.fullName")}>
                    <Input name="fullName" defaultValue={profile.fullName ?? ""} />
                  </Field>
                  <Field label={t("cv.headline")}>
                    <Input name="headline" defaultValue={profile.headline ?? ""} placeholder="Full-Stack Developer" />
                  </Field>
                  <Field label={t("auth.email")}>
                    <Input name="email" defaultValue={profile.email ?? ""} />
                  </Field>
                  <Field label={t("cv.phone")}>
                    <Input name="phone" defaultValue={profile.phone ?? ""} />
                  </Field>
                  <Field label={t("common.location")}>
                    <Input name="location" defaultValue={profile.location ?? ""} />
                  </Field>
                  <Field label={t("cv.years")}>
                    <Input name="yearsExperience" type="number" min={0} max={60} defaultValue={profile.yearsExperience ?? ""} />
                  </Field>
                </div>
                <Field label={t("cv.summary")}>
                  <Textarea name="summary" defaultValue={profile.summary ?? ""} rows={3} />
                </Field>
                <Field label={t("cv.skills")} hint={t("cv.skillsHint")}>
                  <Textarea name="skills" defaultValue={profile.skills.join(", ")} rows={3} />
                </Field>
                <Field label={t("cv.languages")} hint={t("cv.languagesHint")}>
                  <Textarea name="languages" defaultValue={profile.languages.map((l) => `${l.name}${l.level ? ` – ${l.level}` : ""}`).join("\n")} rows={3} />
                </Field>
                <Field label={t("cv.experience")} hint="Titel | Firma | Start | Ende | Beschreibung — eine Station pro Zeile">
                  <Textarea
                    name="experience"
                    rows={6}
                    className="font-mono text-xs"
                    defaultValue={profile.experience.map((e) => [e.title, e.company ?? "", e.start ?? "", e.end ?? "heute", e.description ?? ""].join(" | ")).join("\n")}
                  />
                </Field>
                <Field label={t("cv.education")} hint="Abschluss | Institution | Start | Ende">
                  <Textarea
                    name="education"
                    rows={3}
                    className="font-mono text-xs"
                    defaultValue={profile.education.map((e) => [e.degree, e.institution ?? "", e.start ?? "", e.end ?? ""].join(" | ")).join("\n")}
                  />
                </Field>
                <SubmitButton>{t("common.save")}</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title={t("cv.upload")} sub={t("cv.uploadHint")} />
            <ActionForm action={uploadCvAction} className="space-y-3 p-5">
              <input
                type="file"
                name="cv"
                required
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              {profile && canAddProfile && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" name="asNew" /> Als zusätzliches Profil anlegen
                </label>
              )}
              {profile && !canAddProfile && <p className="text-xs text-muted">Ein neuer Upload ersetzt die Profildaten.</p>}
              {!ai && <p className="text-xs text-warn">{t("sources.aiNone")}</p>}
              <SubmitButton className="w-full" pendingText={t("cv.parsing")}>
                {t("cv.upload")}
              </SubmitButton>
            </ActionForm>
          </Card>

          {profile && (profile.suggestedCategories.length > 0 || profile.missingQualifications.length > 0) && (
            <Card className="p-5">
              {profile.suggestedCategories.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold">{t("cv.suggested")}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.suggestedCategories.map((c) => (
                      <Badge key={c} tone="accent">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
              {profile.missingQualifications.length > 0 && (
                <>
                  <h3 className="mt-4 text-sm font-semibold">{t("cv.missing")}</h3>
                  <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
                    {profile.missingQualifications.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title={t("cv.documents")} />
            <ul className="divide-y divide-line text-sm">
              {docs.length === 0 && <li className="px-5 py-4 text-muted">{t("common.none")}</li>}
              {docs.map((d) => (
                <li key={d.id} className="px-5 py-3">
                  <div className="truncate font-medium">{d.fileName}</div>
                  <div className="text-xs text-muted">
                    {formatDate(d.createdAt, locale, true)} · {Math.round(d.sizeBytes / 1024)} KB · {d.parseMethod ?? d.parseStatus}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
