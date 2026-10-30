import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { ApplicationStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { isUuid } from "@/lib/text";
import { activeProvider } from "@/lib/ai";
import { canTransition } from "@/lib/applications/state";
import { generateLetterAction, saveLetterAction, saveNotesAction, setStatusAction } from "@/app/actions/applications";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Alert, Badge, Button, Card, CardHeader, PageHeader, STATUS_TONE, ScoreBadge, Select, Textarea, formatDate } from "@/components/ui";

export default async function ApplicationDetail({ params }: PageProps<"/applications/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const { t, locale } = await getT();
  const db = getDb();
  const [row] = await db
    .select({ app: schema.applications, job: schema.jobs, match: schema.matches })
    .from(schema.applications)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .leftJoin(schema.matches, eq(schema.matches.id, schema.applications.matchId))
    .where(and(eq(schema.applications.id, id), eq(schema.applications.userId, user.id)));
  if (!row) notFound();
  const { app, job, match } = row;
  const events = await db.select().from(schema.applicationEvents).where(eq(schema.applicationEvents.applicationId, id)).orderBy(asc(schema.applicationEvents.createdAt));
  const editable = app.status === "draft" || app.status === "pending_approval";
  const ai = activeProvider();
  const applyHref = job.applyUrl ?? job.url;

  const statusButton = (to: ApplicationStatus, label: string, variant: "primary" | "secondary" | "ghost" | "danger" = "secondary") =>
    canTransition(app.status, to) ? (
      <form key={to} action={setStatusAction}>
        <input type="hidden" name="id" value={app.id} />
        <input type="hidden" name="to" value={to} />
        <SubmitButton variant={variant} size="sm">
          {label}
        </SubmitButton>
      </form>
    ) : null;

  return (
    <>
      <PageHeader
        title={job.title}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            {job.company} · {job.remote ? t("common.remote") : (job.location ?? "–")} · {job.source}
            <Badge tone={STATUS_TONE[app.status]}>{t(`status.${app.status}`)}</Badge>
            {match && <ScoreBadge score={match.score} />}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Next step – always one clear action */}
          <Card className="p-5">
            {app.status === "pending_approval" || app.status === "draft" ? (
              <div className="flex flex-wrap items-center gap-3">
                {statusButton("approved", `✓ ${t("apps.approve")}`, "primary")}
                {statusButton("withdrawn", t("apps.withdraw"), "ghost")}
              </div>
            ) : app.status === "approved" ? (
              <div className="space-y-3">
                <Alert tone="info">{t("apps.markAppliedHint")}</Alert>
                <div className="flex flex-wrap gap-3">
                  <a href={applyHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink">
                    {t("apps.openApply")} ↗
                  </a>
                  {statusButton("applied_externally", t("apps.markApplied"))}
                  {statusButton("pending_approval", t("apps.backToDraft"), "ghost")}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {statusButton("interview", t("apps.setInterview"))}
                {statusButton("offer", t("apps.setOffer"))}
                {statusButton("rejected", t("apps.setRejected"), "ghost")}
                {statusButton("withdrawn", t("apps.withdraw"), "ghost")}
                {app.appliedAt && <span className="text-xs text-muted">{formatDate(app.appliedAt, locale, true)}</span>}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title={t("apps.coverLetter")}
              sub={app.coverLetterMethod ? `${app.coverLetterMethod} · ${app.coverLetterLanguage ?? ""}` : undefined}
              action={
                editable && ai ? (
                  <ActionForm action={generateLetterAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={app.id} />
                    <Select name="language" defaultValue={app.coverLetterLanguage ?? "auto"} className="h-8 w-auto py-0 text-xs">
                      <option value="auto">Auto</option>
                      <option value="de">DE</option>
                      <option value="en">EN</option>
                      <option value="fr">FR</option>
                      <option value="es">ES</option>
                      <option value="ar">AR</option>
                    </Select>
                    <SubmitButton size="sm" variant="secondary" pendingText="…">
                      {app.coverLetter ? t("apps.regenerate") : t("apps.generate")}
                    </SubmitButton>
                  </ActionForm>
                ) : null
              }
            />
            <div className="space-y-3 p-5">
              {!ai && editable && <Alert tone="warn">{t("apps.noAi")}</Alert>}
              {app.claimWarnings.length > 0 && (
                <Alert tone="warn">
                  {t("apps.claims")} <strong>{app.claimWarnings.join(", ")}</strong>
                </Alert>
              )}
              {editable ? (
                <ActionForm action={saveLetterAction} className="space-y-3">
                  <input type="hidden" name="id" value={app.id} />
                  <Textarea name="coverLetter" rows={16} defaultValue={app.coverLetter ?? ""} className="leading-relaxed" dir="auto" />
                  <SubmitButton size="sm" variant="secondary">
                    {t("common.save")}
                  </SubmitButton>
                </ActionForm>
              ) : (
                <div className="whitespace-pre-wrap rounded-lg bg-surface-2 p-4 text-sm leading-relaxed" dir="auto">
                  {app.coverLetter ?? "–"}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("common.position")} action={<a href={job.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">{job.source} ↗</a>} />
            <div className="max-h-[480px] overflow-y-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-muted" dir="auto">
              {job.description || "–"}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          {match && (
            <Card className="p-5 text-sm">
              <h3 className="font-semibold">{t("common.score")}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-y-1 text-muted tabular">
                <dt>Skills</dt><dd className="text-end">{match.breakdown.skills} / 45</dd>
                <dt>Titel</dt><dd className="text-end">{match.breakdown.title} / 30</dd>
                <dt>Ort</dt><dd className="text-end">{match.breakdown.location} / 15</dd>
                <dt>Sprache</dt><dd className="text-end">{match.breakdown.language} / 10</dd>
                {match.breakdown.seniorityPenalty > 0 && (<><dt>Seniorität</dt><dd className="text-end">−{match.breakdown.seniorityPenalty}</dd></>)}
              </dl>
              {match.breakdown.missingSkills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {match.breakdown.missingSkills.map((s) => (
                    <Badge key={s} tone="warn">{s}</Badge>
                  ))}
                </div>
              )}
            </Card>
          )}
          <Card>
            <CardHeader title={t("apps.notes")} />
            <ActionForm action={saveNotesAction} className="space-y-2 p-4">
              <input type="hidden" name="id" value={app.id} />
              <Textarea name="notes" rows={4} defaultValue={app.notes ?? ""} />
              <Button size="sm" variant="secondary">{t("common.save")}</Button>
            </ActionForm>
          </Card>
          <Card>
            <CardHeader title={t("apps.timeline")} />
            <ol className="space-y-3 p-5 text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-s-2 border-line ps-3">
                  <div className="font-medium">{e.toStatus ? t(`status.${e.toStatus}` as never) : e.type.replaceAll("_", " ")}</div>
                  <div className="text-xs text-muted">
                    {formatDate(e.createdAt, locale, true)} · {e.actor}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
